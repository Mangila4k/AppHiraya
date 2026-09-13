// ============================================
// FACE++ (MEGVII) FACE RECOGNITION
// ============================================
// Console: https://console.faceplusplus.com/
// Docs: https://console.faceplusplus.com/documents/5679127
// ============================================

const FACEPP_BASE_URL = 'https://api-us.faceplusplus.com/facepp/v3';

const FACEPP_API_KEY = process.env.EXPO_PUBLIC_FACEPP_API_KEY || '';
const FACEPP_API_SECRET = process.env.EXPO_PUBLIC_FACEPP_API_SECRET || '';

console.log('🔑 Face++ Key loaded:', FACEPP_API_KEY ? '✅ yes' : '❌ missing');

// ============================================
// HELPER — Clean base64
// ============================================
function cleanBase64(input: string): string {
  return input
    .replace(/^data:image\/[a-z]+;base64,/, '')
    .replace(/\s/g, '');
}

// ============================================
// DETECT — Get a face_token from base64 image
// ============================================
export async function getFaceTokenFromBase64(
  rawBase64: string
): Promise<string | null> {
  try {
    if (!FACEPP_API_KEY || !FACEPP_API_SECRET) {
      console.error('Face++ credentials not set');
      return null;
    }

    const base64 = cleanBase64(rawBase64);

    console.log('📏 Base64 length:', base64.length);
    console.log('📏 Base64 preview:', base64.substring(0, 50));

    const body =
      `api_key=${encodeURIComponent(FACEPP_API_KEY)}` +
      `&api_secret=${encodeURIComponent(FACEPP_API_SECRET)}` +
      `&image_base64=${encodeURIComponent(base64)}` +
      `&return_landmark=0` +
      `&return_attributes=none` +
      `&quality_filter=0.7,0.6`;

    console.log('📡 Sending face to Face++ detect...');
    console.log('📏 Body length:', body.length);

    const response = await fetch(`${FACEPP_BASE_URL}/detect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    });

    const data = await response.json();
    console.log('📥 Face++ detect response:', data);

    if (data.error_message) {
      console.error('Face++ Detect Error:', data.error_message);
      return null;
    }

    if (!data.faces || data.faces.length === 0) {
      console.warn('Face++: No face detected');
      return null;
    }

    return data.faces[0].face_token;
  } catch (e) {
    console.error('Face++ Network Error:', e);
    return null;
  }
}

// ============================================
// COMPARE — Compare two face_tokens
// ============================================
export async function compareFaceTokens(
  token1: string,
  token2: string
): Promise<number | null> {
  try {
    if (!FACEPP_API_KEY || !FACEPP_API_SECRET) {
      console.error('Face++ credentials not set');
      return null;
    }

    const body =
      `api_key=${encodeURIComponent(FACEPP_API_KEY)}` +
      `&api_secret=${encodeURIComponent(FACEPP_API_SECRET)}` +
      `&face_token1=${encodeURIComponent(token1)}` +
      `&face_token2=${encodeURIComponent(token2)}`;

    console.log('📡 Sending face comparison to Face++...');

    const response = await fetch(`${FACEPP_BASE_URL}/compare`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    });

    const data = await response.json();
    console.log('📥 Face++ compare response:', data);

    if (data.error_message) {
      console.error('Face++ Compare Error:', data.error_message);
      return null;
    }

    return data.confidence;
  } catch (e) {
    console.error('Face++ Network Error:', e);
    return null;
  }
}