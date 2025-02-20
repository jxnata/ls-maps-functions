import { Client, ID, Query, Users, Databases } from 'node-appwrite'
import appleSigninAuth from 'apple-signin-auth'
import crypto from 'crypto'
import axios from 'axios'

const client = new Client()

client
	.setEndpoint(process.env.APPWRITE_ENDPOINT)
	.setProject(process.env.APPWRITE_PROJECT_ID)
	.setKey(process.env.APPWRITE_API_KEY)

const users = new Users(client)
const databases = new Databases(client)

// ----------> Create AppWrite session <----------
const createSession = async (name, email, congregation) => {
	const search = await users.list([Query.equal('email', email)])

	if (search.total === 0) {
		const newUser = await users.create(ID.unique(), email, undefined, undefined, name)
		await users.updateLabels(newUser.$id, [congregation])

		// Create a new publisher for user
		const newPublisher = await databases.createDocument('production', 'publishers', ID.unique(), {
			user: newUser.$id,
			name: name || '',
			congregation: congregation || '',
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
			congregation: congregation || '',
		})

		publisherId = newPublisher.$id
	} else {
		publisherId = publisherSearch.documents[0].$id
	}

	const token = await users.createToken(search.users[0].$id)

	return { token, publisherId }
}

export default async ({ req, res, log, error }) => {
	try {
		const payload = JSON.parse(req.body)

		if (!payload.provider) throw new Error('Provide an oauth type')

		if (payload.provider === 'apple') {
			let name

			if (payload.fullName) {
				if (payload.fullName.givenName) name = payload.fullName.givenName
				if (payload.fullName.familyName) name = name + ' ' + payload.fullName.familyName
			}

			// ----------> Get Apple access token <----------

			const clientSecret = appleSigninAuth.getClientSecret({
				clientID: process.env.APPWRITE_BUNDLE_ID,
				teamID: process.env.APPLE_TEAM_ID,
				privateKey: process.env.APPLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
				keyIdentifier: process.env.APPLE_KEY_ID,
			})

			const options = {
				clientID: process.env.APPWRITE_BUNDLE_ID,
				redirectUri: '',
				clientSecret: clientSecret,
			}

			const tokenResponse = await appleSigninAuth.getAuthorizationToken(payload.authorizationCode, options)

			// ----------> Verify token signature and get unique user's identifier <----------

			const appleIdTokenClaims = await appleSigninAuth.verifyIdToken(tokenResponse.id_token, {
				audience: process.env.APPWRITE_BUNDLE_ID,
				nonce: payload.nonce ? crypto.createHash('sha256').update(payload.nonce).digest('hex') : undefined,
			})

			if (!appleIdTokenClaims.email) {
				return res.send('Empty email, please reset Apple auth for this app and try again.', 400)
			}

			const { token, publisherId } = createSession(name, appleIdTokenClaims.email, payload.congregation)

			return res.send({ ...token, publisherId })
		}

		if (payload.provider === 'google') {
			// ----------> Get Google access token <----------

			const { data } = await axios.get(`https://oauth2.googleapis.com/tokeninfo?id_token=${payload.idToken}`)

			if (!data) throw new Error('Invalid request.')
			if (data.aud !== process.env.GOOGLE_CLIENT_ID_ANDROID && data.aud !== process.env.GOOGLE_CLIENT_ID_IOS)
				throw new Error('Invalid Google ID token.')

			const email = data.email
			const name = data.name

			const { token, publisherId } = createSession(name, email, payload.congregation)

			return res.send({ ...token, publisherId })
		}
	} catch (exception) {
		error(exception)
		return res.send('Authentication failed, please try again later.', 500)
	}
}
