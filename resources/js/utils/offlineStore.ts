// Manejador nativo de IndexedDB para modo sin conexión (Offline-First)

export interface PendingVisita {
    id?: number;
    documentoId: number;
    data: {
        estatus_registrado: string;
        tipo_documento_proceso: string;
        hora_inicio_visita: string;
        hora_fin_visita: string;
        ubicacion_gps: string;
        observaciones_operativas: string;
    };
    fotoBlob?: Blob | null;
    fotoName?: string | null;
    timestamp: string;
}

const DB_NAME = "sefin_offline_db";
const DB_VERSION = 1;
const STORE_VISITAS = "visitas_pendientes";
const STORE_CACHE = "cache_agenda";

function openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        if (!("indexedDB" in window)) {
            reject(new Error("IndexedDB no es soportado por este navegador."));
            return;
        }

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event: any) => {
            const db: IDBDatabase = event.target.result;

            if (!db.objectStoreNames.contains(STORE_VISITAS)) {
                db.createObjectStore(STORE_VISITAS, {
                    keyPath: "id",
                    autoIncrement: true,
                });
            }

            if (!db.objectStoreNames.contains(STORE_CACHE)) {
                db.createObjectStore(STORE_CACHE, { keyPath: "key" });
            }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

/**
 * Guarda una visita en la memoria local cuando el notificador no tiene conexión a internet.
 */
export async function guardarVisitaOffline(visita: PendingVisita): Promise<number> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_VISITAS, "readwrite");
        const store = tx.objectStore(STORE_VISITAS);
        const req = store.add(visita);

        req.onsuccess = () => resolve(req.result as number);
        req.onerror = () => reject(req.error);
    });
}

/**
 * Obtiene todas las visitas pendientes por sincronizar guardadas en el teléfono.
 */
export async function obtenerVisitasPendientes(): Promise<PendingVisita[]> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_VISITAS, "readonly");
        const store = tx.objectStore(STORE_VISITAS);
        const req = store.getAll();

        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
    });
}

/**
 * Elimina una visita de la memoria local una vez que el servidor confirmó su recepción.
 */
export async function eliminarVisitaPendiente(id: number): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_VISITAS, "readwrite");
        const store = tx.objectStore(STORE_VISITAS);
        const req = store.delete(id);

        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
    });
}

/**
 * Guarda la lista de documentos asignados en memoria para poder consultarla sin internet.
 */
export async function guardarAgendaCache(documentos: any[]): Promise<void> {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_CACHE, "readwrite");
            const store = tx.objectStore(STORE_CACHE);
            const req = store.put({ key: "documentos", data: documentos });

            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
        });
    } catch (e) {
        console.warn("No se pudo cachear la agenda en IndexedDB:", e);
    }
}

/**
 * Recupera la lista de documentos guardada en memoria cuando no hay conexión.
 */
export async function obtenerAgendaCache(): Promise<any[]> {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_CACHE, "readonly");
            const store = tx.objectStore(STORE_CACHE);
            const req = store.get("documentos");

            req.onsuccess = () => resolve(req.result?.data || []);
            req.onerror = () => reject(req.error);
        });
    } catch {
        return [];
    }
}

