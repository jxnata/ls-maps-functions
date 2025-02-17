import { Client, Databases } from 'node-appwrite'

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

		// If there's no assigned user, return without doing anything
		if (!payload.assigned) {
			return res.send('No notification needed', 200)
		}

		// Get the map from the database
		const map = await databases.getDocument('production', 'maps', payload.$id)

		// Configure OneSignal notification payload
		const options = {
			method: 'POST',
			headers: {
				accept: 'application/json',
				Authorization: `Basic ${process.env.ONESIGNAL_REST_API_KEY}`,
				'content-type': 'application/json',
			},
			body: JSON.stringify({
				app_id: process.env.ONESIGNAL_APP_ID,
				include_external_user_ids: [payload.assigned],
				headings: {
					en: 'Você recebeu uma designação',
				},
				contents: {
					en: `${map.city.name} - ${map.name}\n${map.address}`,
				},
				// Optional: you can add data property for custom data
				data: {
					map_id: map.$id,
					type: 'assignment',
				},
			}),
		}

		// Send the notification using the new endpoint
		const response = await fetch('https://api.onesignal.com/notifications?c=push', options)

		if (!response.ok) {
			throw new Error('Failed to send OneSignal notification')
		}

		return res.send('Notification sent successfully', 200)
	} catch (exception) {
		error(exception)
		return res.send('Send notification failed, please try again later.', 500)
	}
}
