import { Client, Databases } from 'node-appwrite'
import axios from 'axios'

const client = new Client()

client
	.setEndpoint(process.env.APPWRITE_ENDPOINT)
	.setProject(process.env.APPWRITE_PROJECT_ID)
	.setKey(process.env.APPWRITE_API_KEY)

const databases = new Databases(client)

export default async ({ req, res, log, error }) => {
	try {
		// Get the event data from the request
		const payload = req.body

		log(payload)
		// If there's no assigned user, return without doing anything
		if (!payload.assigned) {
			return res.send('No notification needed', 200)
		}

		// Get the map from the database
		const map = await databases.getDocument('production', 'maps', payload.$id)

		// Configure OneSignal notification payload
		const url = 'https://api.onesignal.com/notifications?c=push'

		const notificationData = {
			app_id: process.env.ONESIGNAL_APP_ID,
			headings: {
				en: 'Você recebeu uma designação',
			},
			contents: {
				en: `${map.city.name} - ${map.name}\n${map.address}`,
			},
			include_external_user_ids: [payload.assigned.$id],
		}
		log(notificationData)

		// Send the notification using axios
		const result = await axios.post(url, notificationData, {
			headers: {
				Authorization: `Key ${process.env.ONESIGNAL_REST_API_KEY}`,
				'Content-Type': 'application/json',
			},
		})
		log(result)

		return res.send('Notification sent successfully', 200)
	} catch (exception) {
		error(exception)
		return res.send('Send notification failed, please try again later.', 500)
	}
}
