const SIGNAL_SERVER = 'wss://raising-initiative-lan-largest.trycloudflare.com';

let params = new URLSearchParams(document.location.search);

let username;

if(!window.localStorage.getItem("username")){
    username = `Usuario#${Math.floor(Math.random() * 2000)}`;
}  else {
    username = window.localStorage.getItem("username");
}

const ROOM = params.get("sala");
const NAME = username;

const ws = new WebSocket(SIGNAL_SERVER);

const peers = new Map();

ws.onopen = () => {

    console.log('Conectado ao servidor');

    ws.send(JSON.stringify({
        type: 'join',
        room: ROOM,
        name: NAME
    }));
};


ws.onmessage = async event => {

    const msg = JSON.parse(event.data);

    /*
     * Servidor informou nosso ID
     */
     if (msg.type === 'hello') {

        console.log('Meu ID:', msg.id);

        return;
    }

    /*
     * Alguém entrou depois de nós
     */
    if (msg.type === 'user-joined') {

        console.log(
            `${msg.user.name} entrou na sala`
        );

        /*
         * IMPORTANTE:
         *
         * Quem já estava na sala cria
         * a conexão com o novo usuário.
         */
        await createPeer(msg.user.id, true);

        return;
    }


    /*
     * Recebemos uma OFFER
     */
    if (msg.type === 'offer') {

        console.log('Offer recebida de', msg.from);

        const peer = await createPeer(msg.from, false);

        await peer.setRemoteDescription(
            msg.data
        );

        const answer = await peer.createAnswer();

        await peer.setLocalDescription(answer);

        sendSignal({
            type: 'answer',
            to: msg.from,
            data: peer.localDescription
        });

        return;
    }


    /*
     * Recebemos uma ANSWER
     */
    if (msg.type === 'answer') {

        console.log('Answer recebida de', msg.from);

        const peer = peers.get(msg.from);

        if (!peer) {
            console.error(
                'Peer não encontrado:',
                msg.from
            );

            return;
        }

        await peer.setRemoteDescription(
            msg.data
        );

        return;
    }


    /*
     * Recebemos ICE
     */
    if (msg.type === 'ice') {

        const peer = peers.get(msg.from);

        if (!peer) {
            return;
        }

        try {

            await peer.addIceCandidate(
                msg.data
            );

        } catch (error) {

            console.error(
                'Erro adicionando ICE:',
                error
            );
        }

        return;
    }


    /*
     * Usuário saiu
     */
    if (msg.type === 'user-left') {

        console.log(
            'Peer saiu:',
            msg.id
        );

        const peer = peers.get(msg.id);

        if (peer) {
            peer.close();
            peers.delete(msg.id);
        }

        return;
    }


    if (msg.type === 'error') {

        console.error(
            'Servidor:',
            msg.message
        );

        return;
    }
};


/*
 * Cria uma conexão WebRTC
 */
async function createPeer(peerId, initiator) {

    /*
     * Se já existe uma conexão,
     * reutiliza ela.
     */
    if (peers.has(peerId)) {
        return peers.get(peerId);
    }


    const peer = new RTCPeerConnection({
        iceServers: [
            {
                urls: 'stun:stun.l.google.com:19302'
            }
        ]
    });


    peers.set(peerId, peer);


    /*
     * ICE candidate
     *
     * Precisamos mandar para o outro peer
     * através do servidor.
     */
    peer.onicecandidate = event => {

        if (!event.candidate) {
            return;
        }

        sendSignal({
            type: 'ice',

            to: peerId,

            data: event.candidate
        });
    };


    /*
     * Conexão estabelecida
     */
    peer.onconnectionstatechange = () => {

        console.log(
            `Peer ${peerId}:`,
            peer.connectionState
        );

        if (
            peer.connectionState === 'failed' ||
            peer.connectionState === 'closed' ||
            peer.connectionState === 'disconnected'
        ) {

            peers.delete(peerId);
        }
    };


    /*
     * Quem recebe o DataChannel
     */
    peer.ondatachannel = event => {

        const channel = event.channel;

        setupChannel(
            peerId,
            channel
        );
    };


    /*
     * Se somos o iniciador,
     * criamos o DataChannel.
     */
    if (initiator) {

        const channel = peer.createDataChannel(
            'chat'
        );

        setupChannel(
            peerId,
            channel
        );


        /*
         * Criar OFFER
         */
        const offer = await peer.createOffer();

        await peer.setLocalDescription(
            offer
        );


        sendSignal({
            type: 'offer',

            to: peerId,

            data: peer.localDescription
        });
    }


    return peer;
}


/*
 * Configura o canal de mensagens
 */
function setupChannel(peerId, channel) {

    const peer = peers.get(peerId);

    if (peer) {
        peer.channel = channel;
    }


    channel.onopen = () => {

        console.log(
            `Canal WebRTC aberto com ${peerId}`
        );

        addMessage(
            'Sistema',
            'Conectado a um usuário.'
        );
    };


    channel.onmessage = event => {

        let msg;

        try {

            msg = JSON.parse(event.data);

        } catch {

            console.log(
                `[${peerId}]`,
                event.data
            );

            return;
        }


        if (msg.type === 'message') {

            addMessage(
                msg.name || 'Anônimo',
                msg.text
            );
        }
    };


    channel.onclose = () => {

        console.log(
            `Canal fechado com ${peerId}`
        );

        addMessage(
            'Sistema',
            'Um usuário saiu.'
        );
    };


    channel.onerror = error => {

        console.error(
            'DataChannel:',
            error
        );
    };
}


/*
 * Envia algo para o servidor
 *
 * Isto é usado SOMENTE para signaling.
 */
function sendSignal(data) {

    if (ws.readyState !== WebSocket.OPEN) {
        console.error(
            'WebSocket não está conectado'
        );

        return;
    }

    ws.send(JSON.stringify(data));
}

function prepareMessage(){
    sendMessage(document.getElementById("userMessage").value);
    document.getElementById("userMessage").value = null;
}

/*
 * Envia uma mensagem para todos
 * os peers conectados.
 */
function sendMessage(text) {

    text = text.trim();

    if (!text) {
        return;
    }


    const message = JSON.stringify({
        type: 'message',
        name: NAME,
        text: text
    });


    for (const peer of peers.values()) {

        if (
            peer.channel &&
            peer.channel.readyState === 'open'
        ) {

            peer.channel.send(message);
        }
    }


    /*
     * Mostra nossa própria mensagem
     */
    addMessage(
        NAME,
        text
    );
}

function addMessage(name, text) {

    const messages = document.querySelector('.messages');

    const message = document.createElement('p');

    message.innerHTML =
        `<strong>${escapeHTML(name)}:</strong> ${escapeHTML(text)}`;

    messages.appendChild(message);

    messages.scrollTop = messages.scrollHeight;

    document.getElementById("yove-got-mail").play();
}

function escapeHTML(text) {

    const div = document.createElement('div');

    div.textContent = text;

    return div.innerHTML;
}
