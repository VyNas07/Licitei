import { MongoClient, type Db, type Collection, type Document } from 'mongodb'
import { config } from '../config'

let client: MongoClient | null = null
let db: Db | null = null

export async function getDb(): Promise<Db> {
  if (db) return db
  client = new MongoClient(config.mongo.uri)
  await client.connect()
  db = client.db(config.mongo.dbName)
  console.log(`[MongoDB] Conectado ao banco: ${config.mongo.dbName}`)
  return db
}

export async function getCollection<T extends Document = Document>(): Promise<Collection<T>> {
  const database = await getDb()
  return database.collection<T>(config.mongo.collection)
}

export async function closeDb(): Promise<void> {
  if (client) {
    await client.close()
    client = null
    db = null
  }
}
