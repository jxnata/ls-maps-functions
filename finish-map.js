import { Client, Databases, Query, Users } from 'node-appwrite'

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
		const headers = req.headers
		const userId = headers['x-appwrite-user-id']

		const user = await users.get(userId)
		const userLabels = user.labels || []

		const map = await databases.getDocument('production', 'maps', payload.$id)
		const publisher = await databases.listDocuments('production', 'publishers', [Query.equal('user', userId)])

		if (!map) throw new Error('not allowed: map not found')
		if (!publisher.documents[0]) throw new Error('not allowed: publisher not found')
		if (!userLabels.includes(map.congregation.$id)) throw new Error('not allowed: congregation')
		if (publisher.documents[0].$id !== map.assigned.$id) throw new Error('not allowed: assigned')

		await databases.updateDocument('production', 'maps', payload.$id, {
			assigned: null,
			found: payload.found,
			visited: Date.now(),
		})

		return res.send('Map assignment updated')
	} catch (exception) {
		error(exception)
		return res.send('Middleware check error, please try again later.', 401)
	}
}
