import mongoose from 'mongoose'
import fs from 'fs'
import dotenv from 'dotenv'

dotenv.config()

// Modelos das collections (ajuste os schemas conforme sua estrutura)
const City = mongoose.model('City', new mongoose.Schema({}, { strict: false }))
const Map = mongoose.model('Map', new mongoose.Schema({}, { strict: false }))

// URL de conexão do MongoDB (ajuste conforme seu ambiente)
const MONGODB_URI = process.env.DATABASE_URL

async function compareMaps() {
	try {
		// Conecta ao MongoDB
		await mongoose.connect(MONGODB_URI)
		console.log('Conectado ao MongoDB')

		// Lê os mapas do arquivo JSON
		const exportedMaps = JSON.parse(fs.readFileSync('./migration/export/maps.json', 'utf-8'))

		// Busca todos os mapas da collection
		const dbMaps = await Map.find({})

		// Cria um conjunto de IDs dos mapas exportados
		const exportedMapIds = new Set(exportedMaps.map((map) => map._id.toString()))

		// Verifica se existem mapas no banco que não estão no arquivo JSON
		const missingMaps = dbMaps.filter((map) => !exportedMapIds.has(map._id.toString()))

		if (missingMaps.length > 0) {
			console.log('Mapas que não estão no arquivo JSON:')
			missingMaps.forEach((map) => console.log(map))
		} else {
			console.log('Todos os mapas estão presentes no arquivo JSON.')
		}

		// Comparação de campos dos mapas
		for (const dbMap of dbMaps) {
			const exportedMap = exportedMaps.find((map) => map._id.toString() === dbMap._id.toString())
			if (exportedMap) {
				const differences = Object.keys(dbMap.toObject()).reduce((acc, key) => {
					// Ignora os campos especificados
					if (['congregation', 'last_visited', 'last_visited_by', 'assigned', 'updated_at'].includes(key))
						return acc

					if (JSON.stringify(dbMap[key]) !== JSON.stringify(exportedMap[key])) {
						acc[key] = {
							dbValue: dbMap[key],
							exportedValue: exportedMap[key],
						}
					}
					return acc
				}, {})

				if (Object.keys(differences).length > 0) {
					console.log(`Diferenças encontradas no mapa com ID ${dbMap._id}:`, differences)
				}
			}
		}
	} catch (error) {
		console.error('Erro durante a comparação:', error)
	} finally {
		// Fecha a conexão com o MongoDB
		await mongoose.disconnect()
	}
}

// Executa a comparação
compareMaps()
