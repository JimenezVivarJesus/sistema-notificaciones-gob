<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast; // 🚀 IMPORTANTE
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class DocumentoActualizado implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $notificadorId;

    /**
     * Creamos el evento guardando el ID del notificador que recibió el trabajo.
     */
    public function __construct($notificadorId = null)
    {
        $this->notificadorId = $notificadorId;
    }

    /**
     * 📡 DEFINICIÓN DE CANALES: Indicamos por dónde viaja la señal.
     */
    public function broadcastOn(): array
    {
        $canales = [
            // A. Canal público para actualizar la grilla del Administrador al instante
            new Channel('sefin-canal')
        ];

        // B. Si se le asignó a un notificador, abrimos su canal privado para su celular
        if ($this->notificadorId) {
            $canales[] = new PrivateChannel('user.' . $this->notificadorId);
        }

        return $canales;
    }
}

