/* Configuración editable de la experiencia. */
const CONFIG = {
  nombre: "Mimi",
  fechaInicio: "2023-11-06",
  gatos: [
    { nombre: "Gato 1", tipo: "blanco" },
    { nombre: "Gato 2", tipo: "manchas" },
    { nombre: "Gato 3", tipo: "atigrado" }
  ],
  firma: "— Jatunencio",
  fechaFirma: "6 de noviembre",
  textoFinal: "bipipi",
  mostrarPista: true,
  pausaColina: 20,
  botonReiniciar: false,
  vibracion: true,
  PATRONES: {
    toque: [30],
    micro: [10],
    tic: [12],
    latido: [40, 110, 25],
    latidoLento: [50, 160, 30],
    pulsoDoble: [25, 70, 25],
    crescendo: [15, 90, 25, 80, 40, 70, 60, 60, 90],
    rafaga: [30, 60, 35, 55, 40, 50, 50, 45, 70, 40, 110]
  }
};

(() => {
  "use strict";

  const canvas = document.querySelector("#cielo");
  const contexto = canvas.getContext("2d");
  const canvasFinal = document.querySelector("#cierre-meteoros");
  const contextoFinal = canvasFinal.getContext("2d");
  const escenas = [...document.querySelectorAll(".escena")];
  const corazon = document.querySelector("#abrir-corazon");
  const audio = document.querySelector("#musica");
  const controlAudio = document.querySelector("#control-audio");
  const reducido = window.matchMedia("(prefers-reduced-motion: reduce)");
  const cantidadEstrellas = 112;
  const cantidadRemolinos = 24;
  const estrellas = [];
  const remolinos = [];
  const meteoros = [];
  const petalos = [];
  const estadoAnimo = {
    nombre: "sereno",
    estrellas: 1,
    brillo: 1,
    remolinos: 1
  };
  let escenaActual = "umbral";
  let animacionId = null;
  let audioPausadoPorPagina = false;
  let audioIniciado = false;
  let temporizadorMeteoro = null;
  let temporizadorContinuar = null;
  let tituloEscrito = false;
  let cartaPausa = 0;
  let cartaEscribiendo = false;
  let cartaTextoActual = "";
  let cartaTemporizador = null;
  let paginaOculta = false;
  let galaxiasDibujadas = false;
  let cierreActivo = false;
  let cierreTemporizador = null;
  let lluviaFinalActiva = false;
  let cierreLluviaInicio = 0;
  let cierreInicio = 0;
  let cierreRafId = null;
  let cierrePausaInicio = 0;
  let lineaTiempoId = null;
  let lineaTiempoInicio = 0;
  let lineaTiempoPausa = 0;
  let lineaTiempoPausadaEn = 0;
  let meteorosFinales = [];
  let audioFinalId = null;
  let latidoFinalTemporizador = null;
  // La primera pulsación del corazón habilita las APIs hápticas del navegador móvil.
  let usuarioInteractuo = false;
  let ultimoPulsoLluvia = 0;
  let ultimaVibracion = 0;
  let wakeLock = null;
  const parametros = new URLSearchParams(window.location.search);
  const escenaPruebas = parametros.get("escena");
  const modoPruebas = ["1", "2", "3", "4", "5"].includes(escenaPruebas);

  const perfilesAnimo = {
    sereno: { estrellas: 1, brillo: 1, remolinos: 1 },
    oscuro: { estrellas: .48, brillo: .55, remolinos: .45 },
    dicha: { estrellas: 1.18, brillo: 1.3, remolinos: 1.25 }
  };

  function vibrar(nombre) {
    if (!usuarioInteractuo || !CONFIG.vibracion || reducido.matches || document.hidden || window.matchMedia("(orientation: landscape)").matches) {
      return;
    }
    if (!navigator.vibrate || !CONFIG.PATRONES[nombre]) return;
    const ahora = performance.now();
    if (ahora - ultimaVibracion < 150) return;
    ultimaVibracion = ahora;
    try {
      navigator.vibrate(CONFIG.PATRONES[nombre]);
    } catch (error) {
      // Algunos navegadores exponen la API, pero la bloquean fuera de una interacción.
    }
  }

  async function solicitarWakeLock() {
    if (!("wakeLock" in navigator) || document.hidden) return;
    try {
      wakeLock = await navigator.wakeLock.request("screen");
    } catch (error) {
      wakeLock = null;
    }
  }

  function liberarWakeLock() {
    if (wakeLock) {
      wakeLock.release().catch(() => {});
      wakeLock = null;
    }
  }

  function prepararPantalla() {
    const pantalla = document.querySelector("#pantalla-carga");
    const fuentes = document.fonts ? document.fonts.ready : Promise.resolve();
    const audioListo = new Promise((resolve) => {
      if (audio.readyState >= 3) {
        resolve();
        return;
      }
      audio.addEventListener("canplaythrough", resolve, { once: true });
      audio.addEventListener("error", resolve, { once: true });
    });
    Promise.race([Promise.all([fuentes, audioListo]), new Promise((resolve) => window.setTimeout(resolve, 4000))])
      .then(() => pantalla.classList.add("pantalla-carga--lista"));
  }

  function crearEstrellas() {
    estrellas.length = 0;
    for (let indice = 0; indice < cantidadEstrellas; indice += 1) {
      estrellas.push({
        x: Math.random(),
        y: Math.random(),
        radio: Math.random() * 1.35 + .35,
        brillo: Math.random() * .65 + .2,
        fase: Math.random() * Math.PI * 2,
        velocidad: Math.random() * .0012 + .0005
      });
    }

    remolinos.length = 0;
    for (let indice = 0; indice < cantidadRemolinos; indice += 1) {
      remolinos.push({
        x: Math.random(),
        y: Math.random(),
        fase: Math.random() * Math.PI * 2,
        amplitud: Math.random() * .018 + .008,
        velocidad: Math.random() * .00035 + .00015,
        radio: Math.random() * 1.6 + .6,
        tono: indice % 4 === 0 ? "dorado" : indice % 2 === 0 ? "indigo" : "azul"
      });
    }
  }

  function ajustarCanvas() {
    const escala = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(window.innerWidth * escala);
    canvas.height = Math.floor(window.innerHeight * escala);
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
    contexto.setTransform(escala, 0, 0, escala, 0, 0);
    canvasFinal.width = Math.floor(window.innerWidth * escala);
    canvasFinal.height = Math.floor(window.innerHeight * escala);
    canvasFinal.style.width = `${window.innerWidth}px`;
    canvasFinal.style.height = `${window.innerHeight}px`;
    contextoFinal.setTransform(escala, 0, 0, escala, 0, 0);
  }

  function gaussiano() {
    let u = 0;
    let v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(Math.PI * 2 * v);
  }

  function dibujarGalaxia(canvas, semilla, densidad) {
    const ancho = 420;
    const alto = 260;
    const escala = Math.min(window.devicePixelRatio || 1, 2);
    const offscreen = typeof OffscreenCanvas === "function"
      ? new OffscreenCanvas(ancho * escala, alto * escala)
      : document.createElement("canvas");
    offscreen.width = ancho * escala;
    offscreen.height = alto * escala;
    const lienzo = offscreen.getContext("2d");
    lienzo.scale(escala, escala);
    const centroX = ancho / 2;
    const centroY = alto / 2;
    const nucleo = lienzo.createRadialGradient(centroX, centroY, 2, centroX, centroY, 72);
    nucleo.addColorStop(0, "rgba(255,255,255,.92)");
    nucleo.addColorStop(.2, "rgba(246,210,122,.78)");
    nucleo.addColorStop(.62, "rgba(255,143,184,.24)");
    nucleo.addColorStop(1, "rgba(255,143,184,0)");
    lienzo.fillStyle = nucleo;
    lienzo.beginPath();
    lienzo.arc(centroX, centroY, 72, 0, Math.PI * 2);
    lienzo.fill();
    const colores = ["#ff8fb8", "#9d7be8", "#527fd1", "#f6d27a"];
    for (let indice = 0; indice < 400 * densidad; indice += 1) {
      const radio = 8 + Math.random() * (Math.min(ancho, alto) * .46);
      const brazo = indice % 2;
      const angulo = radio * .045 + brazo * Math.PI + gaussiano() * .11;
      const dispersion = gaussiano() * (4 + radio * .035);
      const x = centroX + Math.cos(angulo) * radio + Math.cos(angulo + Math.PI / 2) * dispersion;
      const y = centroY + Math.sin(angulo) * radio * .52 + Math.sin(angulo + Math.PI / 2) * dispersion * .52;
      lienzo.globalAlpha = Math.max(.12, .72 - radio / (alto * 1.5));
      lienzo.fillStyle = colores[(indice + semilla) % colores.length];
      lienzo.beginPath();
      lienzo.arc(x, y, Math.random() * 1.7 + .45, 0, Math.PI * 2);
      lienzo.fill();
    }
    lienzo.globalAlpha = 1;
    const destino = canvas.getContext("2d");
    canvas.width = ancho * escala;
    canvas.height = alto * escala;
    canvas.style.aspectRatio = `${ancho} / ${alto}`;
    destino.drawImage(offscreen, 0, 0);
  }

  function prepararGalaxias() {
    if (galaxiasDibujadas) return;
    document.querySelectorAll(".galaxia").forEach((galaxia, indice) => {
      dibujarGalaxia(galaxia, indice * 3, 1);
    });
    galaxiasDibujadas = true;
  }

  const SVG_NS = "http://www.w3.org/2000/svg";

  function nodoSvg(nombre, atributos = {}) {
    const nodo = document.createElementNS(SVG_NS, nombre);
    Object.entries(atributos).forEach(([clave, valor]) => nodo.setAttribute(clave, valor));
    return nodo;
  }

  function crearPeonia(tamano, retrasoMs, posicion = { x: 0, y: 0 }) {
    const flor = nodoSvg("svg", {
      class: "peonia-instance",
      viewBox: "-100 -100 200 200",
      x: posicion.x - tamano,
      y: posicion.y - tamano,
      width: tamano * 2,
      height: tamano * 2,
      role: "img",
      "aria-label": "Peonía rosa",
      overflow: "visible"
    });
    const id = `gradiente-peonia-${Math.random().toString(36).slice(2)}`;
    const defs = nodoSvg("defs");
    const gradiente = nodoSvg("radialGradient", { id, cx: "50%", cy: "68%", r: "68%" });
    gradiente.append(
      nodoSvg("stop", { offset: "0%", "stop-color": "#d94f87" }),
      nodoSvg("stop", { offset: "72%", "stop-color": "#ff8fb8" }),
      nodoSvg("stop", { offset: "100%", "stop-color": "#ffd0e2" })
    );
    defs.append(gradiente);
    flor.append(defs);

    const tallo = nodoSvg("path", { class: "peonia__tallo", d: "M0 12 Q-8 58 -24 104" });
    const hojas = nodoSvg("g", { class: "peonia__hojas" });
    hojas.append(
      nodoSvg("path", { class: "peonia__hoja", d: "M-14 65 Q-72 38 -88 67 Q-55 94 -16 78Z" }),
      nodoSvg("path", { class: "peonia__vena", d: "M-18 72 Q-51 64 -78 66" }),
      nodoSvg("path", { class: "peonia__hoja", d: "M-20 82 Q32 45 63 67 Q30 96 -20 89Z" }),
      nodoSvg("path", { class: "peonia__vena", d: "M-14 86 Q24 76 51 70" })
    );
    flor.append(tallo, hojas);

    const capas = [
      { cantidad: 7, radio: 48, alto: 68, retraso: 280 },
      { cantidad: 6, radio: 35, alto: 57, retraso: 140 },
      { cantidad: 5, radio: 23, alto: 45, retraso: 0 }
    ];
    capas.forEach((capa, indiceCapa) => {
      const grupo = nodoSvg("g", { class: `peonia__capa peonia__capa--${indiceCapa}` });
      for (let indice = 0; indice < capa.cantidad; indice += 1) {
        const angulo = indice * (360 / capa.cantidad) + (indiceCapa * 14);
        const petalo = nodoSvg("path", {
          class: "peonia__petalo",
          d: `M0 10 C-${capa.radio * .55} 1 -${capa.radio * .58} -${capa.alto * .55} 0 -${capa.alto} C${capa.radio * .58} -${capa.alto * .55} ${capa.radio * .55} 1 0 10Z`,
          fill: `url(#${id})`,
          transform: `rotate(${angulo})`,
          style: `animation-delay:${retrasoMs + capa.retraso + indice * 55}ms`
        });
        grupo.append(petalo);
        if (indice % 2 === 0) {
          const reflejo = nodoSvg("path", {
            class: "peonia__reflejo",
            d: `M0 1 C-${capa.radio * .22} -4 -${capa.radio * .28} -${capa.alto * .36} 0 -${capa.alto * .7}`,
            transform: `rotate(${angulo})`
          });
          grupo.append(reflejo);
        }
      }
      flor.append(grupo);
    });

    const estambres = nodoSvg("g", { class: "peonia__estambres" });
    for (let indice = 0; indice < 12; indice += 1) {
      const angulo = indice * Math.PI * 2 / 12;
      estambres.append(nodoSvg("circle", {
        cx: Math.cos(angulo) * 13,
        cy: 8 + Math.sin(angulo) * 13,
        r: "2.1"
      }));
    }
    flor.append(estambres);
    return flor;
  }

  function crearCapullo(tamano, retrasoMs, posicion) {
    const capullo = nodoSvg("svg", {
      class: "capullo-instance",
      viewBox: "-70 -100 140 210",
      x: posicion.x - tamano,
      y: posicion.y - tamano * 1.05,
      width: tamano * 2,
      height: tamano * 2.2,
      role: "img",
      "aria-label": "Capullo de peonía",
      overflow: "visible",
      style: `animation-delay:${retrasoMs}ms`
    });
    capullo.append(
      nodoSvg("path", { class: "peonia__tallo", d: "M0 35 Q-7 75 -18 105" }),
      nodoSvg("path", { class: "peonia__hoja", d: "M-10 73 Q-52 47 -63 72 Q-38 91 -8 82Z" }),
      nodoSvg("path", { class: "peonia__vena", d: "M-10 79 Q-37 70 -55 71" }),
      nodoSvg("path", { class: "capullo__sepalos", d: "M-39 25 Q0 45 39 25 L25 64 Q0 79 -25 64Z" }),
      nodoSvg("ellipse", { class: "capullo__forma", cx: "0", cy: "0", rx: "30", ry: "52" })
    );
    return capullo;
  }

  function prepararFloresColina() {
    try {
      const contenedor = document.querySelector(".colina__flores");
      contenedor.replaceChildren();
      [
        [88, 0, 145, 1540], [68, 180, 245, 1440], [80, 360, 430, 1570],
        [74, 540, 700, 1510], [92, 720, 900, 1450], [62, 900, 940, 1580]
      ].forEach(([tamano, retraso, x, y]) => contenedor.append(crearPeonia(tamano, retraso, { x, y })));
      [
        [42, 1800, 205, 1535], [38, 2100, 560, 1510],
        [45, 2400, 820, 1570], [34, 2700, 925, 1570]
      ].forEach(([tamano, retraso, x, y]) => contenedor.append(crearCapullo(tamano, retraso, { x, y })));
    } catch (error) {
      console.error("No se pudieron inicializar las peonías de la escena 4:", error);
    }
  }

  function prepararGatosColina() {
    try {
      document.querySelectorAll(".gato").forEach((gato) => {
        gato.classList.remove("gato--reaccionando");
      });
    } catch (error) {
      console.error("No se pudieron inicializar los gatos de la escena 4:", error);
    }
  }

  function dibujarCielo(marcaTiempo = 0) {
    contexto.clearRect(0, 0, window.innerWidth, window.innerHeight);
    dibujarRemolinos(marcaTiempo);
    const limiteCarta = escenaActual === "carta";
    const estrellasVisibles = Math.min(Math.floor(cantidadEstrellas * estadoAnimo.estrellas), limiteCarta ? 80 : cantidadEstrellas);
    estrellas.slice(0, estrellasVisibles).forEach((estrella) => {
      const parpadeo = reducido.matches
        ? estrella.brillo
        : estrella.brillo * (.7 + Math.sin(marcaTiempo * estrella.velocidad + estrella.fase) * .3) * estadoAnimo.brillo;
      const radio = estrella.radio * (estadoAnimo.estrellas > 1 ? 1.08 : 1);
      const x = estrella.x * window.innerWidth;
      const y = estrella.y * window.innerHeight;
      const halo = contexto.createRadialGradient(x, y, 0, x, y, radio * 5);
      halo.addColorStop(0, `rgba(246, 210, 122, ${Math.max(.04, parpadeo * .18)})`);
      halo.addColorStop(1, "rgba(246, 210, 122, 0)");
      contexto.fillStyle = halo;
      contexto.beginPath();
      contexto.arc(x, y, radio * 5, 0, Math.PI * 2);
      contexto.fill();
      contexto.beginPath();
      contexto.arc(x, y, radio, 0, Math.PI * 2);
      contexto.fillStyle = `rgba(255, 236, 193, ${Math.max(.08, parpadeo)})`;
      contexto.fill();
    });
    meteoros.forEach((meteo) => dibujarMeteoro(meteo));
    petalos.forEach((petalo) => dibujarPetalo(petalo));
    if (!document.hidden) {
      animacionId = requestAnimationFrame(dibujarCielo);
    }

    function dibujarPetalo(petalo) {
      const progreso = Math.min((performance.now() - petalo.inicio) / petalo.duracion, 1);
      const x = petalo.x + Math.sin(performance.now() * .002 + petalo.fase) * 18;
      const y = petalo.y + petalo.velocidad * progreso;
      contexto.save();
      contexto.translate(x, y);
      contexto.rotate(petalo.fase + progreso * 5);
      contexto.fillStyle = petalo.color;
      contexto.beginPath();
      contexto.ellipse(0, 0, petalo.tamano, petalo.tamano * .58, 0, 0, Math.PI * 2);
      contexto.fill();
      contexto.restore();
      if (progreso >= 1) {
        petalos.splice(petalos.indexOf(petalo), 1);
      }
    }
  }

  function dibujarRemolinos(marcaTiempo) {
    const ancho = window.innerWidth;
    const alto = window.innerHeight;
    const limiteRemolinos = escenaActual === "carta" ? 12 : remolinos.length;
    remolinos.slice(0, Math.min(Math.floor(remolinos.length * estadoAnimo.remolinos), limiteRemolinos)).forEach((particula) => {
      const onda = Math.sin(marcaTiempo * particula.velocidad + particula.fase);
      const x = (particula.x + onda * particula.amplitud) * ancho;
      const y = (particula.y + Math.cos(marcaTiempo * particula.velocidad * .8 + particula.fase) * particula.amplitud) * alto;
      const colores = {
        azul: "rgba(87, 139, 221, .45)",
        indigo: "rgba(105, 91, 205, .42)",
        dorado: "rgba(246, 210, 122, .48)"
      };
      contexto.beginPath();
      contexto.arc(x, y, particula.radio, 0, Math.PI * 2);
      contexto.fillStyle = colores[particula.tono];
      contexto.shadowBlur = 7;
      contexto.shadowColor = colores[particula.tono];
      contexto.fill();
      contexto.shadowBlur = 0;
    });
  }

  function dibujarMeteoro(meteo) {
    const progreso = Math.min((performance.now() - meteo.inicio) / meteo.duracion, 1);
    const x = meteo.x + (meteo.destinoX - meteo.x) * progreso;
    const y = meteo.y + (meteo.destinoY - meteo.y) * progreso;
    const colaX = x - (meteo.destinoX - meteo.x) * .15;
    const colaY = y - (meteo.destinoY - meteo.y) * .15;
    const estela = contexto.createLinearGradient(colaX, colaY, x, y);
    estela.addColorStop(0, "rgba(255, 143, 184, 0)");
    estela.addColorStop(1, meteo.color);
    contexto.beginPath();
    contexto.moveTo(colaX, colaY);
    contexto.lineTo(x, y);
    contexto.strokeStyle = estela;
    contexto.lineWidth = 2;
    contexto.stroke();
    contexto.beginPath();
    contexto.arc(x, y, 2.2, 0, Math.PI * 2);
    contexto.fillStyle = meteo.color;
    contexto.fill();
    if (progreso >= 1) {
      meteoros.splice(meteoros.indexOf(meteo), 1);
    }
  }

  function lanzarMeteoro() {
    if (document.hidden || (escenaActual !== "cielo" && escenaActual !== "escena-4")) {
      return;
    }
    const dorado = Math.random() > .5;
    meteoros.push({
      x: Math.random() * window.innerWidth * .8,
      y: Math.random() * window.innerHeight * .25,
      destinoX: window.innerWidth * (.35 + Math.random() * .65),
      destinoY: window.innerHeight * (.35 + Math.random() * .5),
      inicio: performance.now(),
      duracion: reducido.matches ? 1500 : 950,
      color: dorado ? "rgba(246, 210, 122, .95)" : "rgba(255, 143, 184, .95)"
    });
  }

  function programarMeteoro() {
    window.clearTimeout(temporizadorMeteoro);
    temporizadorMeteoro = window.setTimeout(() => {
      lanzarMeteoro();
      programarMeteoro();
    }, escenaActual === "escena-4" ? 2800 + Math.random() * 2200 : 2000 + Math.random() * 2000);
  }

  function prepararColina() {
    try {
      window.setMood("dicha");
    } catch (error) {
      console.error("No se pudo activar el ánimo dicha en la escena 4:", error);
    }
    try {
      prepararGalaxias();
    } catch (error) {
      console.error("No se pudieron inicializar las galaxias de la escena 4:", error);
    }
    prepararFloresColina();
    prepararGatosColina();
    try {
      [0, 1500, 3000].forEach((retraso) => {
        window.setTimeout(() => {
          if (escenaActual === "escena-4") vibrar("tic");
        }, retraso);
      });
    } catch (error) {
      console.error("No se pudieron programar los pulsos de la escena 4:", error);
    }
    try {
      petalos.length = 0;
      lanzarPetalos(12);
    } catch (error) {
      console.error("No se pudieron inicializar los pétalos de la escena 4:", error);
    }
    const mensaje = document.querySelector(".colina__mensaje");
    try {
      mensaje.classList.remove("colina__mensaje--visible");
    } catch (error) {
      console.error("No se pudo preparar el texto de la escena 4:", error);
    }
    iniciarLineaTiempoColina();
  }

  function limiteParticulas() {
    return meteoros.length + petalos.length < 140;
  }

  function dibujarLluviaFinal() {
    return;
  }

  function iniciarFadeAudio() {
    const inicio = performance.now();
    const volumenInicial = audio.volume;
    function bajar(marcaTiempo) {
      const progreso = Math.min(1, (marcaTiempo - inicio) / 6000);
      audio.volume = volumenInicial * (1 - progreso);
      if (progreso < 1 && !document.hidden) {
        audioFinalId = requestAnimationFrame(bajar);
      }
    }
    audioFinalId = requestAnimationFrame(bajar);
  }

  function iniciarFinal() {
    iniciarCierreVisual();
  }

  function iniciarCierreVisual() {
    try {
      cierreActivo = true;
      lluviaFinalActiva = true;
      document.documentElement.classList.add("lluvia-final-activa");
      document.querySelector(".cierre__mensaje").textContent = CONFIG.textoFinal;
      document.querySelector(".cierre__capa").style.opacity = "0";
      meteorosFinales = [];
    } catch (error) {
      console.error("No se pudo iniciar la capa visual del final:", error);
    }
  }

  function prepararCierre() {
    iniciarCierreVisual();
  }

  function dibujarMeteoroFinal(meteoro, ahora) {
    try {
      const progreso = Math.min(1, (ahora - meteoro.inicio) / meteoro.duracion);
      const x = meteoro.x + (meteoro.destinoX - meteoro.x) * progreso;
      const y = meteoro.y + (meteoro.destinoY - meteoro.y) * progreso;
      const colaX = x - (meteoro.destinoX - meteoro.x) * .16;
      const colaY = y - (meteoro.destinoY - meteoro.y) * .16;
      const estela = contextoFinal.createLinearGradient(colaX, colaY, x, y);
      estela.addColorStop(0, "rgba(255,143,184,0)");
      estela.addColorStop(1, meteoro.color);
      contextoFinal.beginPath();
      contextoFinal.moveTo(colaX, colaY);
      contextoFinal.lineTo(x, y);
      contextoFinal.strokeStyle = estela;
      contexto.lineWidth = meteoro.tamano;
      contextoFinal.lineWidth = meteoro.tamano;
      contextoFinal.stroke();
      contextoFinal.beginPath();
      contextoFinal.arc(x, y, meteoro.tamano * 1.4, 0, Math.PI * 2);
      contextoFinal.fillStyle = meteoro.color;
      contextoFinal.fill();
      return progreso < 1;
    } catch (error) {
      console.error("No se pudo dibujar un meteoro final:", error);
      return false;
    }
  }

  function actualizarLineaTiempo(marcaTiempo) {
    if (document.hidden || window.matchMedia("(orientation: landscape)").matches) return;
    const transcurrido = (marcaTiempo - lineaTiempoInicio - lineaTiempoPausa) / 1000;
    try {
      if (transcurrido >= CONFIG.pausaColina && escenaActual === "escena-4") {
        escenaActual = "escena-5";
        iniciarCierreVisual();
        document.querySelector(".colina__mensaje").classList.add("colina__mensaje--oculto");
      }
    } catch (error) {
      console.error("No se pudo cambiar de la colina a la lluvia final:", error);
    }
    try {
      if (escenaActual === "escena-4" && transcurrido >= 8) {
        const mensaje = document.querySelector(".colina__mensaje");
        if (!mensaje.classList.contains("colina__mensaje--visible")) {
          mensaje.classList.add("colina__mensaje--visible");
          vibrar("latido");
        }
      }
    } catch (error) {
      console.error("No se pudo mostrar el aniversario en la escena 4:", error);
    }
    if (escenaActual === "escena-5") {
      actualizarLluviaPorTiempo(Math.max(0, transcurrido - CONFIG.pausaColina), marcaTiempo);
    }
    lineaTiempoId = requestAnimationFrame(actualizarLineaTiempo);
  }

  function iniciarLineaTiempoColina(desdeLluvia = false) {
    if (lineaTiempoId !== null) cancelAnimationFrame(lineaTiempoId);
    lineaTiempoInicio = performance.now() - (desdeLluvia ? CONFIG.pausaColina * 1000 : 0);
    lineaTiempoPausa = 0;
    lineaTiempoPausadaEn = 0;
    lineaTiempoId = requestAnimationFrame(actualizarLineaTiempo);
  }

  function actualizarLluviaPorTiempo(segundos, ahora) {
    try {
      const intensidad = segundos < 8 ? .12 : segundos < 24 ? (segundos - 8) / 16 : Math.max(0, 1 - (segundos - 24) / 16);
      contextoFinal.clearRect(0, 0, window.innerWidth, window.innerHeight);
      const frecuencia = segundos < 8 ? .4 : 1 + intensidad * 14;
      if (meteorosFinales.length < 150 && Math.random() < frecuencia / 60) {
        const x = Math.random() * window.innerWidth;
        meteorosFinales.push({ x, y: -20, destinoX: x + window.innerWidth * (.2 + Math.random() * .45), destinoY: window.innerHeight * (.35 + Math.random() * .55), inicio: ahora, duracion: 900 + Math.random() * 1000, tamano: 1 + Math.random() * 2, color: Math.random() > .5 ? "rgba(246,210,122,.95)" : "rgba(255,143,184,.95)" });
      }
      meteorosFinales = meteorosFinales.filter((meteoro) => dibujarMeteoroFinal(meteoro, ahora));
      if (segundos >= 14) document.querySelector(".cierre__capa").style.opacity = Math.min(1, (segundos - 14) / 16);
      if (segundos >= 14) audio.volume = .7 * (1 - Math.min(1, (segundos - 14) / 20));
      if (segundos >= 43) {
        document.querySelector(".cierre__mensaje").classList.add("cierre__mensaje--visible");
        if (CONFIG.botonReiniciar) document.querySelector("#reiniciar").classList.add("cierre__reiniciar--visible");
      }
    } catch (error) {
      console.error("No se pudo actualizar la línea de tiempo de la lluvia final:", error);
    }
  }

  function calcularNoches() {
    const inicio = new Date(`${CONFIG.fechaInicio}T00:00:00`);
    const hoy = new Date();
    const ahoraLocal = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
    return Math.max(0, Math.floor((ahoraLocal - inicio) / 86400000));
  }

  function escribirTitulo() {
    if (tituloEscrito) {
      return;
    }
    tituloEscrito = true;
    const titulo = document.querySelector("#cielo-titulo");
    const texto = `Felices tres años, ${CONFIG.nombre}`;
    let indice = 0;
    const escribir = () => {
      titulo.textContent = texto.slice(0, indice);
      indice += 1;
      if (indice <= texto.length) {
        window.setTimeout(escribir, reducido.matches ? 55 : 75);
      } else {
        vibrar("pulsoDoble");
      }
    };
    escribir();
  }

  function animarContador() {
    const elemento = document.querySelector("#contador-noches");
    const destino = calcularNoches();
    const duracion = reducido.matches ? 700 : 3000;
    const inicio = performance.now();
    const avanzar = (marcaTiempo) => {
      const progreso = Math.min((marcaTiempo - inicio) / duracion, 1);
      const suavizado = 1 - Math.pow(1 - progreso, 3);
      elemento.textContent = Math.floor(destino * suavizado).toLocaleString("es-ES");
      if (progreso < 1) {
        requestAnimationFrame(avanzar);
      }
    };
    requestAnimationFrame(avanzar);
    window.setTimeout(() => {
      elemento.textContent = destino.toLocaleString("es-ES");
      vibrar("latido");
    }, duracion + 50);
  }

  function prepararCielo() {
    escribirTitulo();
    animarContador();
    const boton = document.querySelector("#continuar-cielo");
    window.clearTimeout(temporizadorContinuar);
    temporizadorContinuar = window.setTimeout(() => boton.classList.add("boton-continuar--visible"), reducido.matches ? 1200 : 8000);
    programarMeteoro();
  }

  function detenerCielo() {
    window.clearTimeout(temporizadorContinuar);
    window.clearTimeout(temporizadorMeteoro);
    document.querySelector("#continuar-cielo").classList.remove("boton-continuar--visible");
    meteoros.length = 0;
  }

  const textosCarta = [
    { mood: "sereno", texto: "Sentado aquí, pensando en ti, amada mía, recuerdo nuestras conversaciones y no puedo evitar sentir cierto temor al pensar en el porvenir." },
    { mood: "oscuro", texto: "Pues el futuro se me antoja tan distante e incierto, tan triste y solitario, que hasta me pregunto: ¿con qué habré de soñar, cuando en la vida real he conocido tanta dicha a tu lado?" },
    { mood: "dicha", texto: "¡Oh, bendita seas, mi querida muchacha, por no haberme apartado a la primera!" },
    { mood: "sereno", texto: "Pues ahora puedo decir que he vivido de verdad, que he conocido la dicha de estar vivo durante tantas noches de mi existencia." }
  ];

  function lanzarPetalos(cantidad = 26) {
    for (let indice = 0; indice < cantidad; indice += 1) {
      petalos.push({
        x: Math.random() * window.innerWidth,
        y: -Math.random() * window.innerHeight * .35,
        inicio: performance.now(),
        duracion: 7000 + Math.random() * 5000,
        velocidad: window.innerHeight * (.8 + Math.random() * .45),
        fase: Math.random() * Math.PI * 2,
        tamano: 3 + Math.random() * 4,
        color: `rgba(255, ${105 + Math.floor(Math.random() * 60)}, ${155 + Math.floor(Math.random() * 55)}, .72)`
      });
    }
  }

  function lanzarLluviaDicha() {
    for (let indice = 0; indice < 14; indice += 1) {
      meteoros.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight * .35,
        destinoX: Math.random() * window.innerWidth,
        destinoY: Math.random() * window.innerHeight * .65,
        inicio: performance.now() + indice * 55,
        duracion: 750 + Math.random() * 500,
        color: indice % 2 ? "rgba(246, 210, 122, .95)" : "rgba(255, 143, 184, .95)"
      });
    }
  }

  function mostrarContinuarCarta() {
    document.querySelector("#continuar-carta").classList.add("carta__continuar--visible");
  }

  function completarCarta() {
    if (!cartaEscribiendo) {
      return;
    }
    window.clearTimeout(cartaTemporizador);
    document.querySelector("#carta-texto").textContent = cartaTextoActual;
    document.querySelector("#carta-texto").classList.add("carta__texto--completo");
    cartaEscribiendo = false;
    mostrarContinuarCarta();
    if (cartaPausa === 3) {
      document.querySelector("#carta-firma").textContent = CONFIG.firma;
      document.querySelector("#carta-fecha").textContent = CONFIG.fechaFirma;
      document.querySelector("#carta-firma").classList.add("carta__firma--visible");
      document.querySelector("#carta-fecha").classList.add("carta__fecha--visible");
    }
  }

  function escribirCarta(texto) {
    const elemento = document.querySelector("#carta-texto");
    cartaTextoActual = texto;
    cartaEscribiendo = true;
    elemento.classList.remove("carta__texto--completo");
    elemento.textContent = "";
    let indice = 0;
    const escribir = () => {
      if (!cartaEscribiendo) {
        return;
      }
      elemento.textContent = texto.slice(0, indice);
      indice += 1;
      if (indice <= texto.length) {
        cartaTemporizador = window.setTimeout(escribir, reducido.matches ? 24 : 62);
      } else {
        completarCarta();
      }
    };
    escribir();
  }

  function prepararCarta() {
    cartaPausa = 0;
    petalos.length = 0;
    window.setMood(textosCarta[0].mood);
    vibrar("tic");
    document.querySelector("#carta-firma").classList.remove("carta__firma--visible");
    document.querySelector("#carta-fecha").classList.remove("carta__fecha--visible");
    document.querySelector("#continuar-carta").classList.remove("carta__continuar--visible");
    escribirCarta(textosCarta[0].texto);
  }

  function avanzarCarta() {
    completarCarta();
    cartaPausa += 1;
    const siguiente = textosCarta[cartaPausa];
    if (!siguiente) {
      cambiarEscena("escena-4");
      return;
    }
    const elemento = document.querySelector("#carta-texto");
    elemento.style.opacity = "0";
    document.querySelector("#continuar-carta").classList.remove("carta__continuar--visible");
    window.setTimeout(() => {
      window.setMood(siguiente.mood);
      vibrar("tic");
      if (cartaPausa === 2) {
        vibrar("rafaga");
        lanzarLluviaDicha();
        lanzarPetalos(32);
      } else if (cartaPausa === 3) {
        lanzarPetalos(16);
      }
      escribirCarta(siguiente.texto);
      elemento.style.opacity = "1";
    }, 500);
  }

  function cambiarEscena(nombre) {
    const colina = document.querySelector('[data-scene="escena-4"]');
    const esContinuacion = nombre === "escena-5" && escenaActual === "escena-4";
    if (nombre !== "escena-5") {
      escenas.forEach((escena) => {
        const activa = escena.dataset.scene === nombre;
        escena.classList.toggle("escena--activa", activa);
        escena.setAttribute("aria-hidden", String(!activa));
      });
    } else {
      escenas.forEach((escena) => {
        const activa = escena.dataset.scene === "escena-4";
        escena.classList.toggle("escena--activa", activa);
        escena.setAttribute("aria-hidden", String(!activa));
      });
    }
    colina.classList.toggle("colina--fondo-cierre", nombre === "escena-5");
    document.documentElement.classList.toggle("lluvia-final-activa", nombre === "escena-5");
    escenaActual = nombre;
    if (nombre === "cielo") {
      prepararCielo();
    } else if (nombre === "carta") {
      detenerCielo();
      prepararCarta();
    } else if (nombre === "escena-4") {
      prepararColina();
    } else if (nombre === "escena-5") {
      detenerCielo();
      if (!esContinuacion) {
        prepararCierre();
        escenaActual = "escena-5";
        iniciarLineaTiempoColina(true);
      }
    } else if (escenaActual !== "cielo") {
      detenerCielo();
    }
  }

  function iniciarAudio() {
    if (audioIniciado) {
      return;
    }
    audioIniciado = true;
    audio.volume = 0;
    const inicio = performance.now();
    function subirVolumen(marcaTiempo) {
      const progreso = Math.min((marcaTiempo - inicio) / 4000, 1);
      audio.volume = progreso * .7;
      if (progreso < 1 && !audio.paused) {
        requestAnimationFrame(subirVolumen);
      }
    }
    const reproduccion = audio.play();
    if (reproduccion && typeof reproduccion.catch === "function") {
      reproduccion.catch((error) => {
        audioIniciado = false;
        console.error("No se pudo reproducir audio/sample.mp3. Comprueba el formato MP3 y sirve la página por HTTP(S), no con file://.", error);
      });
      reproduccion.then(() => requestAnimationFrame(subirVolumen));
      return;
    }
    requestAnimationFrame(subirVolumen);
  }

  function abrirUmbral() {
    if (corazon.disabled) {
      return;
    }
    corazon.disabled = true;
    usuarioInteractuo = true;
    vibrar("toque");
    corazon.classList.add("corazon-umbral--final");
    iniciarAudio();
    window.setTimeout(() => cambiarEscena("cielo"), 900);
  }

  function alternarAudio() {
    if (audio.paused) {
      audio.play().catch((error) => console.error("No se pudo activar audio/sample.mp3 desde el control de música:", error));
      controlAudio.setAttribute("aria-pressed", "false");
      controlAudio.setAttribute("aria-label", "Silenciar música");
    } else {
      audio.pause();
      controlAudio.setAttribute("aria-pressed", "true");
      controlAudio.setAttribute("aria-label", "Activar música");
    }
  }

  function gestionarVisibilidad() {
    if (document.hidden) {
      document.documentElement.classList.add("animaciones-pausadas");
      paginaOculta = true;
      cierrePausaInicio = performance.now();
      lineaTiempoPausadaEn = performance.now();
      if (lineaTiempoId !== null) {
        cancelAnimationFrame(lineaTiempoId);
        lineaTiempoId = null;
      }
      window.clearTimeout(latidoFinalTemporizador);
      if (audioFinalId !== null) cancelAnimationFrame(audioFinalId);
      if (navigator.vibrate) {
        try { navigator.vibrate(0); } catch (error) {}
      }
      liberarWakeLock();
      audioPausadoPorPagina = !audio.paused;
      if (audioPausadoPorPagina) {
        audio.pause();
      }
      if (animacionId !== null) {
        cancelAnimationFrame(animacionId);
        animacionId = null;
      }
      return;
    }
    paginaOculta = false;
    if (cierrePausaInicio && cierreActivo) {
      cierreInicio += performance.now() - cierrePausaInicio;
      cierrePausaInicio = 0;
    }
    if (lineaTiempoPausadaEn) {
      lineaTiempoPausa += performance.now() - lineaTiempoPausadaEn;
      lineaTiempoPausadaEn = 0;
    }
    document.documentElement.classList.remove("animaciones-pausadas");
    solicitarWakeLock();
    if (audioPausadoPorPagina && !controlAudio.matches('[aria-pressed="true"]')) {
      audio.play().catch((error) => console.error("No se pudo reanudar el audio:", error));
    }
    audioPausadoPorPagina = false;
    if (animacionId === null) {
      animacionId = requestAnimationFrame(dibujarCielo);
    }
    if (escenaActual === "cielo" || escenaActual === "escena-4") {
      programarMeteoro();
    }
    if (escenaActual === "escena-5" && lluviaFinalActiva) {
      dibujarLluviaFinal();
    }
    if (escenaActual === "escena-5" && cierreActivo) {
      cierreRafId = requestAnimationFrame(actualizarFinal);
    }
    if (escenaActual === "escena-4" || escenaActual === "escena-5") {
      lineaTiempoId = requestAnimationFrame(actualizarLineaTiempo);
    }
  }

  function gestionarOrientacion() {
    const horizontal = window.matchMedia("(orientation: landscape)").matches;
    document.documentElement.classList.toggle("orientacion-horizontal", horizontal);
    if (horizontal) {
      if (navigator.vibrate) {
        try { navigator.vibrate(0); } catch (error) {}
      }
      document.documentElement.classList.add("animaciones-pausadas");
      if (!lineaTiempoPausadaEn) lineaTiempoPausadaEn = performance.now();
      if (lineaTiempoId !== null) {
        cancelAnimationFrame(lineaTiempoId);
        lineaTiempoId = null;
      }
      if (animacionId !== null) {
        cancelAnimationFrame(animacionId);
        animacionId = null;
      }
    } else if (!paginaOculta) {
      document.documentElement.classList.remove("animaciones-pausadas");
      if (animacionId === null) {
        animacionId = requestAnimationFrame(dibujarCielo);
      }
      if ((escenaActual === "escena-4" || escenaActual === "escena-5") && lineaTiempoId === null) {
        lineaTiempoPausa += performance.now() - lineaTiempoPausadaEn;
        lineaTiempoPausadaEn = 0;
        lineaTiempoId = requestAnimationFrame(actualizarLineaTiempo);
      }
    }
  }

  window.setMood = (nombre) => {
    const perfil = perfilesAnimo[nombre];
    if (!perfil) {
      console.warn(`Ánimo desconocido: ${nombre}`);
      return;
    }
    estadoAnimo.nombre = nombre;
    estadoAnimo.estrellas = perfil.estrellas;
    estadoAnimo.brillo = perfil.brillo;
    estadoAnimo.remolinos = perfil.remolinos;
  };

  crearEstrellas();
  ajustarCanvas();
  prepararGalaxias();
  prepararPantalla();
  solicitarWakeLock();
  animacionId = requestAnimationFrame(dibujarCielo);
  corazon.addEventListener("click", abrirUmbral);
  if (!CONFIG.mostrarPista) {
    document.querySelector(".pista-umbral").hidden = true;
  }
  controlAudio.addEventListener("click", alternarAudio);
  document.querySelector("#continuar-cielo").addEventListener("click", () => cambiarEscena("carta"));
  document.querySelector("#carta-texto").addEventListener("click", completarCarta);
  document.querySelector("#continuar-carta").addEventListener("click", avanzarCarta);
  document.querySelector("#reiniciar").addEventListener("click", () => window.location.reload());
  document.querySelectorAll(".gato").forEach((gato) => {
    const reaccionar = () => {
      const indice = Number(gato.dataset.gato);
      gato.classList.remove("gato--reaccionando");
      void gato.offsetWidth;
      gato.classList.add("gato--reaccionando");
      if (typeof navigator.vibrate === "function") {
        navigator.vibrate(15);
      }
      const corazonGato = document.querySelector(".gato__corazon");
      const nombreGato = document.querySelector(".gato__nombre");
      corazonGato.classList.remove("gato__corazon--visible");
      nombreGato.classList.remove("gato__nombre--visible");
      nombreGato.textContent = CONFIG.gatos[indice].nombre;
      void corazonGato.offsetWidth;
      corazonGato.classList.add("gato__corazon--visible");
      nombreGato.classList.add("gato__nombre--visible");
    };
    gato.addEventListener("click", reaccionar);
    gato.addEventListener("keydown", (evento) => {
      if (evento.key === "Enter" || evento.key === " ") {
        evento.preventDefault();
        reaccionar();
      }
    });
  });
  window.addEventListener("resize", ajustarCanvas);
  window.addEventListener("resize", gestionarOrientacion);
  window.addEventListener("orientationchange", gestionarOrientacion);
  document.addEventListener("visibilitychange", gestionarVisibilidad);
  if (modoPruebas) {
    const escenasPrueba = {
      "1": "umbral",
      "2": "cielo",
      "3": "carta",
      "4": "escena-4",
      "5": "escena-5"
    };
    usuarioInteractuo = true;
    iniciarAudio();
    cambiarEscena(escenasPrueba[escenaPruebas]);
  }
  gestionarOrientacion();
})();