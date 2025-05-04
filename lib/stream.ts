import { StreamClient, UserRequest } from "@stream-io/node-sdk";

const apiKey = process.env.GET_STREAM_API_KEY!;
const apiSecret = process.env.GET_STREAM_API_SECRET_KEY!;

console.log("API Key:", apiKey);
console.log("API Secret:", apiSecret);

if (!apiKey) {
  throw new Error("GET_STREAM_API_KEY must be set");
}

if (!apiSecret) {
  throw new Error("GET_STREAM_API_SECRET_KEY must be set");
}

const client = new StreamClient(apiKey, apiSecret);

export async function generateUserToken(userId: string, name: string) {
  console.log("Generating user token for user:", userId);
  const newUser: UserRequest = {
    id: userId,
    role: 'user',
    name: name,
    
  };

   const user = await client.upsertUsers([newUser]);
   console.log("User:", user);

  const validity = 60 * 60

  const token = client.generateUserToken({
    user_id: userId,
    validity_in_seconds: validity,
  })
  console.log("Token:", token);
  return token;
}
