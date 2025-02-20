import { Client, Databases, ID, Permission, Role } from 'node-appwrite'
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
const COLLECTION_ID = 'cities'

async function migrateCities() {
	try {
		// Cria a pasta 'appwrite' se ela não existir
		if (!fs.existsSync('./migration/appwrite')) {
			fs.mkdirSync('./migration/appwrite')
		}

		// Lê o arquivo cities.json
		const citiesData = JSON.parse(fs.readFileSync('./migration/export/cities.json', 'utf-8'))
		const migratedCities = []
		const errors = []

		console.log(`Iniciando migração de ${citiesData.length} cidades...`)

		// Itera sobre cada cidade
		for (const city of citiesData) {
			try {
				// Cria o documento no Appwrite
				const result = await databases.createDocument(
					DATABASE_ID,
					COLLECTION_ID,
					ID.unique(),
					{
						name: city.name.trim(),
						congregation: city.congregation,
					},
					[
						Permission.read(Role.label(city.congregation)),
						Permission.update(Role.label(city.congregation)),
						Permission.delete(Role.label(city.congregation)),
						Permission.update(Role.label('admin')),
						Permission.delete(Role.label('admin')),
					]
				)

				migratedCities.push(result)
				console.log(`Cidade migrada com sucesso: ${city.name}`)
			} catch (error) {
				console.error(`Erro ao migrar cidade:`, error)
				errors.push({
					city,
					error: error.message,
				})
			}
		}

		// Salva os resultados
		fs.writeFileSync('./migration/appwrite/cities_migrated.json', JSON.stringify(migratedCities, null, 2), 'utf-8')

		// Se houver erros, salva em um arquivo separado
		if (errors.length > 0) {
			fs.writeFileSync('./migration/appwrite/cities_errors.json', JSON.stringify(errors, null, 2), 'utf-8')
		}

		console.log(`Migração concluída!`)
		console.log(`Total migrado: ${migratedCities.length}`)
		console.log(`Total de erros: ${errors.length}`)
	} catch (error) {
		console.error('Erro durante a migração:', error)
	}
}

// Executa a migração
migrateCities()
