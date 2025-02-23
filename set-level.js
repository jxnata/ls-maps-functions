import { Client, Query, Databases, Users } from 'node-appwrite'

const client = new Client()

client
	.setEndpoint(process.env.APPWRITE_ENDPOINT)
	.setProject(process.env.APPWRITE_PROJECT_ID)
	.setKey(process.env.APPWRITE_API_KEY)

const databases = new Databases(client)
const users = new Users(client)

export default async ({ req, res, log, error }) => {
	try {
		log(req)
		// User update event
		if (req.headers['x-appwrite-event'].includes('users')) {
			// Get the event data from the request
			const payload = req.body

			// Check if this is a user update event and involves labels
			if (!payload.labels) {
				return res.send('Not a relevant user update event', 200)
			}

			// Check if 'admin' label was added or removed
			const adminAdded = payload.labels.includes('admin')

			// Find the publisher in production database
			const publisher = await databases.listDocuments('production', 'publishers', [
				Query.equal('user', payload.$id),
			])

			if (publisher.documents.length === 0) {
				return res.send('No publisher found for this user', 200)
			}

			// Update publisher level
			const newLevel = adminAdded ? 1 : 3

			await databases.updateDocument('production', 'publishers', publisher.documents[0].$id, { level: newLevel })

			return res.send(`Publisher level updated to ${newLevel}`, 200)
		}

		// Publisher update event
		if (req.headers['x-appwrite-event'].includes('databases.production.collections.publishers.documents')) {
			// Get the event data from the request
			const payload = req.body

			// Check if this is a publisher update event and involves level
			if (!payload.level) {
				return res.send('Not a relevant publisher update event', 200)
			}

			// Update user level
			const user = await users.get(payload.user)

			if (payload.level === 1) {
				// Add 'admin' label to the user
				await users.updateLabels(user.$id, [...user.labels.filter((label) => label !== 'admin'), 'admin'])
			} else {
				// Remove 'admin' label from the user
				await users.updateLabels(
					user.$id,
					user.labels.filter((label) => label !== 'admin')
				)
			}

			return res.send(`User level updated to ${payload.level}`, 200)
		}
	} catch (exception) {
		error(exception)
		return res.send('Set level failed, please try again later.', 500)
	}
}
