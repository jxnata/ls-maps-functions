import { Client, Databases, Users } from 'node-appwrite'

const client = new Client()

client
	.setEndpoint(process.env.APPWRITE_ENDPOINT)
	.setProject(process.env.APPWRITE_PROJECT_ID)
	.setKey(process.env.APPWRITE_API_KEY)

const databases = new Databases(client)
const users = new Users(client)

export default async ({ req, res, log, error }) => {
	try {
		// // Get the event data from the request
		// const payload = req.body
		// const userId = payload.userId
		// const documentId = payload.$id
		// const updates = payload.changes

		// // Buscar o usuário para obter labels
		// const user = await users.get(userId)
		// const userLabels = user.labels || []

		// // Buscar o documento atualizado
		// const document = await databases.getDocument('production', 'maps', documentId)

		// // Verificar se o usuário pertence à mesma congregation_id
		// const userCongregationId = userLabels.find((label) => label.startsWith('congregation_'))?.split(':')[1]
		// if (!userCongregationId || userCongregationId !== document.congregation_id) {
		// 	return res.json({ success: false, message: 'Você não tem permissão para modificar este documento.' }, 403)
		// }

		// // Bloquear se o usuário for admin (pois admin já tem permissão)
		// if (userLabels.includes('admin')) {
		// 	return res.json({ success: false, message: 'Admins já têm permissões suficientes.' }, 403)
		// }

		// // Permitir alteração apenas do campo assigned
		// const allowedUpdates = ['assigned']
		// const isValidUpdate = Object.keys(updates).every((key) => allowedUpdates.includes(key))

		// if (!isValidUpdate) {
		// 	return res.json({ success: false, message: "Você só pode modificar o campo 'assigned'." }, 403)
		// }
		log(req)

		return res.send('Atualização permitida.')
	} catch (exception) {
		error(exception)
		return res.send('Middleware check error, please try again later.', 500)
	}
}
