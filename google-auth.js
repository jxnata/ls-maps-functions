import { Client, ID, Query, Users, Databases } from 'node-appwrite'
import axios from 'axios'

const client = new Client()

client
	.setEndpoint(process.env.APPWRITE_ENDPOINT)
	.setProject(process.env.APPWRITE_PROJECT_ID)
	.setKey(process.env.APPWRITE_API_KEY)

const users = new Users(client)
const databases = new Databases(client)

export default async ({ req, res, log, error }) => {
	try {
		const payload = JSON.parse(req.body)

		// ----------> Get Google access token <----------

		const { data } = await axios.get(`https://oauth2.googleapis.com/tokeninfo?id_token=${payload.idToken}`)

		if (!data) throw new Error('Invalid request.')
		if (data.aud !== process.env.GOOGLE_CLIENT_ID_ANDROID && data.aud !== process.env.GOOGLE_CLIENT_ID_IOS)
			throw new Error('Invalid Google ID token.')

		const email = data.email
		const name = data.name

		// ----------> Create AppWrite session <----------

		const search = await users.list([Query.equal('email', email)])

		if (search.total === 0) {
			const newUser = await users.create(ID.unique(), email, undefined, undefined, name)
			await users.updateLabels(newUser.$id, [payload.congregation])

			// Create a new publisher for user
			const newPublisher = await databases.createDocument('production', 'publishers', ID.unique(), {
				user: newUser.$id,
				name: name || '',
				congregation: payload.congregation || '',
			})

			const token = await users.createToken(newUser.$id)
			return res.send({ ...token, publisherId: newPublisher.$id })
		}

		let publisherId

		// Verify if the publisher already exists
		const publisherSearch = await databases.listDocuments('production', 'publishers', [
			Query.equal('user', search.users[0].$id),
		])

		if (publisherSearch.total === 0) {
			const newPublisher = await databases.createDocument('production', 'publishers', ID.unique(), {
				user: search.users[0].$id,
				name: name || '',
				congregation: payload.congregation || '',
			})

			publisherId = newPublisher.$id
		} else {
			publisherId = publisherSearch.documents[0].$id
		}

		const token = await users.createToken(search.users[0].$id)
		return res.send({ ...token, publisherId })
	} catch (exception) {
		error(exception)
		return res.send('Authentication failed, please try again later.', 500)
	}
}
