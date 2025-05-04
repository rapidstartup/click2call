import { StreamVideoClient, User } from '@stream-io/video-react-sdk';

const API_KEY = import.meta.env.VITE_GET_STREAM_API_KEY;

if (!API_KEY) {
  throw new Error('Missing GetStream API key');
}

// Generate a random guest ID and name
export const createGuestUser = (): User => {
  const randomId = Math.random().toString(36).substring(7);
  return {
    id: `guest-${randomId}`,
    name: `Guest_${randomId}`,
    image: '',
  };
};

// Token provider function for guest users
const tokenProvider = async (userId: string, userName: string) => {
  const response = await fetch(`${import.meta.env.VITE_API_URL}/generateUserToken`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ userId, name: userName }),
  });
  console.log("Response: in streamVideo.ts", response);

  if (!response.ok) {
    throw new Error('Failed to fetch token');
    console.log("Response:", response);
  }

  const data = await response.json();
  console.log("Token:", data.token);
  return data.token;
};

// Create StreamVideo client instance
export const createStreamVideoClient = (user: User) => {
  return StreamVideoClient.getOrCreateInstance({
    apiKey: API_KEY,
    user,
    tokenProvider: () => tokenProvider(user?.id!, user.name!),
  });
}; 