// PEGA AQUÍ LA URL TERMINADA EN /exec QUE OBTENDRÁS EN TU GOOGLE SHEETS (Extensiones > Apps Script > Implementar)
const API_URL = "https://script.google.com/macros/s/AKfycbw27VqiOWqP9NCfHHvTahqkLH20NttQ3YhZ6cjuotbsaEv35r6cw11NJ4H6ldHivqNLLQ/exec";

function obtenerHoraSalvador() {
    const opciones = {
        timeZone: 'America/El_Salvador',
        hour12: false,
        day: 'numeric',
        weekday: 'long',
        hour: 'numeric',
        minute: 'numeric'
    };
    const partes = new Intl.DateTimeFormat('en-US', opciones).formatToParts(new Date());
    let datos = { diaMes: 0, diaSemana: '', hora: 0, minuto: 0 };

    partes.forEach(p => {
        if (p.type === 'day') datos.diaMes = parseInt(p.value, 10);
        if (p.type === 'weekday') datos.diaSemana = p.value.toLowerCase();
        if (p.type === 'hour') datos.hora = parseInt(p.value, 10);
        if (p.type === 'minute') datos.minuto = parseInt(p.value, 10);
    });

    datos.minutosTotales = (datos.hora === 24 ? 0 : datos.hora) * 60 + datos.minuto;
    return datos;
}

function obtenerProximaReunionHoy() {
    const { diaMes, diaSemana, minutosTotales } = obtenerHoraSalvador();
    let reuniones = [];

    // Regla prioritaria: Día 14 de cada mes a las 6:30 PM (18:30 = 1110 min)
    if (diaMes === 14) {
        reuniones.push({ nombre: "Servicio Especial del Día 14", inicio: 18 * 60 + 30, horaTexto: "6:30 PM" });
    } else {
        if (['monday', 'tuesday', 'wednesday', 'friday'].includes(diaSemana)) {
            reuniones.push({ nombre: "Oracion LLDM", inicio: 19 * 60, horaTexto: "7:00 PM" });
        } else if (diaSemana === 'thursday') {
            reuniones.push({ nombre: "Servicio de Jueves", inicio: 18 * 60, horaTexto: "6:00 PM" });
        } else if (diaSemana === 'saturday') {
            reuniones.push({ nombre: "Servicio de Sábado", inicio: 19 * 60, horaTexto: "7:00 PM" });
        } else if (diaSemana === 'sunday') {
            reuniones.push({ nombre: "Escuela Dominical", inicio: 10 * 60, horaTexto: "10:00 AM" });
            reuniones.push({ nombre: "Servicio de Oración", inicio: 18 * 60, horaTexto: "6:00 PM" });
        }
    }

    for (let r of reuniones) {
        // Si aún no ha pasado más de 2 horas desde el inicio programado
        if (minutosTotales < r.inicio + 120) {
            return r;
        }
    }
    return null;
}

async function verificarEstado() {
    const card = document.getElementById('status-card');
    const title = document.getElementById('meeting-title');
    const desc = document.getElementById('meeting-description');
    const actionContainer = document.getElementById('action-container');

    try {
        if (API_URL.startsWith("http")) {
            const respuesta = await fetch(API_URL);
            const datos = await respuesta.json();

            if (datos.estado === "LIVE" && datos.enlace) {
                card.className = "card live";
                title.textContent = "🔴 ¡TRANSMISIÓN EN VIVO!";
                desc.textContent = datos.titulo || "Haz clic abajo para unirte a la reunión.";
                actionContainer.innerHTML = "";

                const btn = document.createElement('a');
                btn.href = datos.enlace;
                btn.className = 'btn-live';
                btn.textContent = 'Entrar a la Transmisión';
                btn.target = '_blank';
                btn.rel = 'noopener noreferrer';
                actionContainer.appendChild(btn);
                return;
            }
        }
    } catch (error) {
        console.error("Consultando horario local...", error);
    }

    // Si no hay transmisión activa en este instante, mostramos información del horario de hoy
    actionContainer.innerHTML = "";
    const proxima = obtenerProximaReunionHoy();

    if (proxima) {
        card.className = "card upcoming";
        title.textContent = `⏳ Hoy: ${proxima.nombre} (${proxima.horaTexto})`;
        desc.textContent = "El botón para entrar aparecerá aquí automáticamente en cuanto inicie la transmisión.";
    } else {
        card.className = "card offline";
        title.textContent = "No hay transmisiones activas";
        desc.textContent = "Las reuniones de hoy han concluido. Consulta nuestros horarios abajo.";
    }
}

verificarEstado();
setInterval(verificarEstado, 30000);
