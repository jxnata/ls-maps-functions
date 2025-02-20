import { Client, Databases, Permission, Role, ID } from 'node-appwrite'
import fs from 'fs'
import dotenv from 'dotenv'

dotenv.config()

// Inicializa o cliente Appwrite
const client = new Client()
	.setEndpoint('https://cloud.appwrite.io/v1') // Ajuste para seu endpoint
	.setProject('ls-maps') // Ajuste para seu Project ID
	.setKey(process.env.API_KEY) // Ajuste para sua API Key

const databases = new Databases(client)

const DATABASE_ID = 'production'
const COLLECTION_ID = 'maps'

async function migrateMaps() {
	try {
		// Cria a pasta 'appwrite' se ela não existir
		if (!fs.existsSync('./migration/appwrite')) {
			fs.mkdirSync('./migration/appwrite')
		}

		// Lê o arquivo de cidades migradas para fazer o mapeamento de IDs
		const migratedCities = JSON.parse(fs.readFileSync('./migration/appwrite/cities_migrated.json', 'utf-8'))

		// Lê o arquivo maps.json
		const mapsData = JSON.parse(fs.readFileSync('./migration/export/maps.json', 'utf-8'))
		const migratedMaps = []
		const errors = []

		console.log(`Iniciando migração de ${mapsData.length} mapas...`)

		// Lê o arquivo de cidades exportadas para fazer o mapeamento de IDs
		const exportedCities = JSON.parse(fs.readFileSync('./migration/export/cities.json', 'utf-8'))

		// Itera sobre cada mapa
		for (const map of mapsData) {
			try {
				// Encontra a cidade correspondente pelo ID
				const exportedCity = exportedCities.find((city) => city._id === map.city)

				if (!exportedCity) {
					throw new Error(`Cidade não encontrada pelo ID: ${map.city}`)
				}

				// Encontra a cidade migrada pelo nome
				const cityDoc = migratedCities.find((city) => city.name.trim() === exportedCity.name.trim())

				if (!cityDoc) {
					throw new Error(`Cidade migrada não encontrada: ${exportedCity.name}`)
				}

				if (map.congregation != cityDoc.congregation.$id) {
					throw new Error(`A congregação do mapa e da cidade não conferem: ${exportedCity.name}`)
				}

				// Prepara o documento para o Appwrite
				const newMapData = {
					name: map.name.trim(),
					address: map.address.trim(),
					details: map.details?.trim(),
					district: map.district?.trim(),
					visited: map.last_visited,
					congregation: map.congregation,
					lat: map.coordinates[0], // Primeiro valor do array para latitude
					lng: map.coordinates[1], // Segundo valor do array para longitude
					city: cityDoc.$id, // Usa o novo ID da cidade
				}

				// Cria o documento no Appwrite
				const result = await databases.createDocument(DATABASE_ID, COLLECTION_ID, ID.unique(), newMapData, [
					Permission.read(Role.label(map.congregation)),
					Permission.update(Role.label(map.congregation)),
					Permission.delete(Role.label(map.congregation)),
					Permission.update(Role.label('admin')),
					Permission.delete(Role.label('admin')),
				])

				migratedMaps.push(result)
				console.log(`Mapa migrado com sucesso: ${map.name || 'Sem nome'}`)
			} catch (error) {
				console.error(`Erro ao migrar mapa:`, error)
				errors.push({
					map,
					error: error.message,
				})
			}
		}

		// Salva os resultados
		fs.writeFileSync('./migration/appwrite/maps_migrated.json', JSON.stringify(migratedMaps, null, 2), 'utf-8')

		// Se houver erros, salva em um arquivo separado
		if (errors.length > 0) {
			fs.writeFileSync('./migration/appwrite/maps_errors.json', JSON.stringify(errors, null, 2), 'utf-8')
		}

		console.log(`Migração concluída!`)
		console.log(`Total migrado: ${migratedMaps.length}`)
		console.log(`Total de erros: ${errors.length}`)
	} catch (error) {
		console.error('Erro durante a migração:', error)
	}
}

// Executa a migração
migrateMaps()
