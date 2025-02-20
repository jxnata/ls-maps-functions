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
		const payload = JSON.parse(req.body)
		const headers = JSON.parse(req.headers)
		const userId = headers['x-appwrite-user-id']

		const user = await users.get(userId)
		const userLabels = user.labels || []

		const document = await databases.getDocument('production', 'maps', payload.$id)

		if (!userLabels.includes(document.congregation.$id)) throw new Error('not allowed: congregation')
		if (userId !== document.assigned.$id) throw new Error('not allowed: assigned')

		await databases.updateDocument('production', 'maps', payload.$id, {
			assigned: false,
			found: payload.found,
		})

		return res.send('Map updated')
	} catch (exception) {
		error(exception)
		return res.send('Middleware check error, please try again later.', 401)
	}
}
