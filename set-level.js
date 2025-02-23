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
		// User update event
		if (req.headers['x-appwrite-event'].includes('users')) {
			const payload = req.body

			if (!payload.labels) {
				return res.send('Not a relevant user update event', 200)
			}

			const adminAdded = payload.labels.includes('admin')
			const newLevel = adminAdded ? 1 : 3

			// Find the publisher in production database
			const publisher = await databases.listDocuments('production', 'publishers', [
				Query.equal('user', payload.$id),
			])

			if (publisher.documents.length === 0) {
				return res.send('No publisher found for this user', 200)
			}

			// Check if the level is already correct to avoid loops
			if (publisher.documents[0].level === newLevel) {
				return res.send('Publisher level already synchronized', 200)
			}

			await databases.updateDocument('production', 'publishers', publisher.documents[0].$id, { level: newLevel })
			return res.send(`Publisher level updated to ${newLevel}`, 200)
		}

		// Publisher update event
		if (req.headers['x-appwrite-event'].includes('databases.production.collections.publishers.documents')) {
			const payload = req.body

			if (!payload.level) {
				return res.send('Not a relevant publisher update event', 200)
			}

			const user = await users.get(payload.user)

			if (!user) return res.send('User not found', 200)

			const hasAdminLabel = user.labels.includes('admin')

			// Check if the label is already correct to avoid loops
			if ((payload.level === 1 && hasAdminLabel) || (payload.level !== 1 && !hasAdminLabel)) {
				return res.send('User labels already synchronized', 200)
			}

			if (payload.level === 1) {
				await users.updateLabels(user.$id, [...user.labels.filter((label) => label !== 'admin'), 'admin'])
			} else {
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
