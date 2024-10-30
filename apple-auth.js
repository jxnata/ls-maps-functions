import { Client, ID, Query, Users } from 'node-appwrite'
import appleSigninAuth from 'apple-signin-auth'
import crypto from 'crypto'

const client = new Client()

client
	.setEndpoint(process.env.APPWRITE_ENDPOINT)
	.setProject(process.env.APPWRITE_PROJECT_ID)
	.setKey(process.env.APPWRITE_API_KEY)

const users = new Users(client)

export default async ({ req, res, log, error }) => {
	try {
		const payload = JSON.parse(req.body)
		let name

		if (payload.fullName) {
			if (payload.fullName.givenName) name = payload.fullName.givenName
			if (payload.fullName.familyName) name = name + ' ' + payload.fullName.familyName
		}

		// ----------> Get Apple access token <----------

		const clientSecret = appleSigninAuth.getClientSecret({
			clientID: process.env.APPWRITE_BUNDLE_ID,
			teamID: process.env.APPLE_TEAM_ID,
			privateKey: process.env.APPLE_PRIVATE_KEY,
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

		// ----------> Create AppWrite session <----------

		if (!appleIdTokenClaims.email) {
			return res.send('Empty email, please reset Apple auth for this app and try again.', 400)
		}

		const search = await users.list([Query.equal('email', appleIdTokenClaims.email)])

		if (search.total === 0) {
			const newUser = await users.create(ID.unique(), appleIdTokenClaims.email, undefined, undefined, name)

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
