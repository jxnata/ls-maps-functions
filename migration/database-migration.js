import mongoose from 'mongoose'
import fs from 'fs'
import dotenv from 'dotenv'

dotenv.config()

// Modelos das collections (ajuste os schemas conforme sua estrutura)
const City = mongoose.model('City', new mongoose.Schema({}, { strict: false }))
const Map = mongoose.model('Map', new mongoose.Schema({}, { strict: false }))

// URL de conexão do MongoDB (ajuste conforme seu ambiente)
const MONGODB_URI = process.env.DATABASE_URL

async function exportCollections() {
	try {
		// Conecta ao MongoDB
		await mongoose.connect(MONGODB_URI)
		console.log('Conectado ao MongoDB')

		// Cria a pasta 'export' se ela não existir
		if (!fs.existsSync('./migration/export')) {
			fs.mkdirSync('./migration/export')
		}

		// Array com as collections para exportar
		const collections = [
			{ model: City, name: 'cities' },
			{ model: Map, name: 'maps' },
		]

		// Exporta cada collection
		for (const collection of collections) {
			console.log(`Exportando ${collection.name}...`)

			// Busca todos os documentos da collection
			const documents = await collection.model.find({})

			// Salva os documentos em um arquivo JSON
			fs.writeFileSync(`./migration/export/${collection.name}.json`, JSON.stringify(documents, null, 2), 'utf-8')

			console.log(`${collection.name} exportada com sucesso!`)
		}

		console.log('Exportação concluída!')
	} catch (error) {
		console.error('Erro durante a exportação:', error)
	} finally {
		// Fecha a conexão com o MongoDB
		await mongoose.disconnect()
	}
}

// Executa a exportação
exportCollections()
