<?php

namespace App\Services;

use Google_Client;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class FirebaseNotificationService
{
    /**
     * Enviar notificación push mediante Firebase Cloud Messaging HTTP v1 API.
     */
    public static function enviar(string $fcmToken, string $titulo, string $cuerpo, array $data = []): bool
    {
        try {
            $credentialsPath = storage_path('app/firebase-credentials.json');
            $credentialsEnv = env('FIREBASE_CREDENTIALS');

            $client = new Google_Client();

            if (!empty($credentialsEnv)) {
                $credentials = is_array($credentialsEnv) ? $credentialsEnv : json_decode($credentialsEnv, true);
                $client->setAuthConfig($credentials);
            } elseif (file_exists($credentialsPath)) {
                $credentials = json_decode(file_get_contents($credentialsPath), true);
                $client->setAuthConfig($credentialsPath);
            } else {
                Log::warning('FirebaseNotificationService: No se encontraron credenciales de Firebase en storage/app/firebase-credentials.json ni en FIREBASE_CREDENTIALS.');
                return false;
            }

            $projectId = $credentials['project_id'] ?? null;
            if (!$projectId) {
                Log::error('FirebaseNotificationService: No se pudo obtener project_id de las credenciales de Firebase.');
                return false;
            }

            $client->addScope('https://www.googleapis.com/auth/firebase.messaging');
            $tokenArray = $client->fetchAccessTokenWithAssertion();
            $accessToken = $tokenArray['access_token'] ?? null;

            if (!$accessToken) {
                Log::error('FirebaseNotificationService: Falló la obtención del access token de Google.', $tokenArray);
                return false;
            }

            $url = "https://fcm.googleapis.com/v1/projects/{$projectId}/messages:send";

            // Formato de carga para Android con alta prioridad y sonido
            $payload = [
                'message' => [
                    'token' => $fcmToken,
                    'notification' => [
                        'title' => $titulo,
                        'body'  => $cuerpo,
                    ],
                    'android' => [
                        'priority' => 'high',
                        'notification' => [
                            'sound' => 'default',
                            'default_sound' => true,
                            'default_vibrate_timings' => true,
                            'notification_priority' => 'PRIORITY_MAX',
                        ],
                    ],
                ],
            ];

            if (!empty($data)) {
                $payload['message']['data'] = array_map(fn($v) => (string)$v, $data);
            }

            $response = Http::withToken($accessToken)
                ->withHeaders(['Content-Type' => 'application/json; UTF-8'])
                ->post($url, $payload);

            if ($response->successful()) {
                Log::info("FirebaseNotificationService: Notificación enviada con éxito.");
                return true;
            }

            Log::error('FirebaseNotificationService: Error al enviar mensaje FCM: ' . $response->body());
            return false;
        } catch (\Throwable $e) {
            Log::error('FirebaseNotificationService Exception: ' . $e->getMessage());
            return false;
        }
    }
}

