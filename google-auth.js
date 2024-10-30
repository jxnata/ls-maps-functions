import { Client, ID, Query, Users } from 'node-appwrite'
import axios from 'axios'

const client = new Client()

client
	.setEndpoint(process.env.APPWRITE_ENDPOINT)
	.setProject(process.env.APPWRITE_PROJECT_ID)
	.setKey(process.env.APPWRITE_API_KEY)

const users = new Users(client)

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

			const token = await users.createToken(newUser.$id)

			return res.send(token)
		}

		const token = await users.createToken(search.users[0].$id)

		return res.send(token)
	} catch (exception) {
		error(exception)
		return res.send('Authentication failed, please try again later.', 500)
	}
}
