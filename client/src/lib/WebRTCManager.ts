import { Socket } from "socket.io-client";

export interface P2PMessage {
    type: "text" | "image" | "video" | "audio" | "document" | "typing" | "receipt" | "reaction" | "edit" | "delete" | "forward";
    sender_id: string;
    recipient_id: string;
    content?: string;
    media_url?: string;
    media_type?: string;
    file_name?: string;
    message_id?: string;
    emoji?: string;
    is_typing?: boolean;
    timestamp?: string;
    is_disappearing?: boolean;
    disappearing_duration?: number;
}

export class WebRTCManager {
    private peers: Map<string, RTCPeerConnection> = new Map();
    private dataChannels: Map<string, RTCDataChannel> = new Map();
    private socket: Socket;
    private currentUserId: string;

    public onMessage?: (msg: P2PMessage) => void;
    public onConnectionUpdate?: (peerId: string, status: "connecting" | "connected" | "disconnected" | "failed") => void;
    public onFileProgress?: (peerId: string, fileName: string, percent: number) => void;
    public onFileReceived?: (peerId: string, fileName: string, blob: Blob) => void;
    public onError?: (peerId: string, error: string) => void;

    private fileChunks: Map<string, { received: number; total: number; chunks: Uint8Array[]; fileName: string }> = new Map();

    constructor(socket: Socket, userId: string) {
        this.socket = socket;
        this.currentUserId = userId;
        this.setupSignaling();
    }

    private setupSignaling() {
        this.socket.on("p2p_signal", async (data: { from: string; signal: any; type: string }) => {
            const { from, signal, type } = data;

            if (type === "offer") {
                await this.handleOffer(from, signal);
            } else if (type === "answer") {
                await this.handleAnswer(from, signal);
            } else if (type === "ice") {
                await this.handleIceCandidate(from, signal);
            }
        });
    }

    private async createPeerConnection(peerId: string): Promise<RTCPeerConnection> {
        const pc = new RTCPeerConnection({
            iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
        });

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                this.socket.emit("p2p_signal", {
                    to: peerId,
                    from: this.currentUserId,
                    signal: event.candidate,
                    type: "ice"
                });
            }
        };

        pc.onconnectionstatechange = () => {
            console.log(`Connection state with ${peerId}: ${pc.connectionState}`);
            this.onConnectionUpdate?.(peerId, pc.connectionState as any);

            if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
                this.peers.delete(peerId);
                this.dataChannels.delete(peerId);
            }
        };

        pc.oniceconnectionstatechange = () => {
            if (pc.iceConnectionState === "failed") {
                this.onError?.(peerId, "ICE Connection Failed");
            }
        };

        pc.ondatachannel = (event) => {
            this.setupDataChannel(peerId, event.channel);
        };

        this.peers.set(peerId, pc);
        return pc;
    }

    private setupDataChannel(peerId: string, channel: RTCDataChannel) {
        channel.binaryType = "arraybuffer";
        channel.onopen = () => {
            console.log(`Data channel open with ${peerId}`);
            this.dataChannels.set(peerId, channel);
        };

        channel.onmessage = async (event) => {
            if (typeof event.data === "string") {
                try {
                    const msg = JSON.parse(event.data);
                    if (msg.type === "file_start") {
                        this.fileChunks.set(`${peerId}-${msg.file_id}`, {
                            received: 0,
                            total: msg.total_chunks,
                            chunks: [],
                            fileName: msg.file_name
                        });
                    } else {
                        this.onMessage?.(msg as P2PMessage);
                    }
                } catch (e) {
                    console.error("Error parsing P2P message:", e);
                }
            } else {
                // Handle binary chunk
                const buffer = event.data as ArrayBuffer;
                const view = new DataView(buffer);
                const fileIdLen = view.getUint8(0);
                const fileId = new TextDecoder().decode(buffer.slice(1, 1 + fileIdLen));
                const chunkIndex = view.getUint32(1 + fileIdLen);
                const chunkData = buffer.slice(5 + fileIdLen);

                const transferId = `${peerId}-${fileId}`;
                const transfer = this.fileChunks.get(transferId);
                if (transfer) {
                    transfer.chunks[chunkIndex] = new Uint8Array(chunkData);
                    transfer.received++;

                    const progress = Math.round((transfer.received / transfer.total) * 100);
                    this.onFileProgress?.(peerId, transfer.fileName, progress);

                    if (transfer.received === transfer.total) {
                        const blob = new Blob(transfer.chunks as any);
                        this.onFileReceived?.(peerId, transfer.fileName, blob);
                        this.fileChunks.delete(transferId);
                    }
                }
            }
        };

        channel.onclose = () => {
            this.dataChannels.set(peerId, null as any); // Or handle appropriately
        };
    }

    public async connectToPeer(peerId: string) {
        if (this.peers.has(peerId)) return;

        const pc = await this.createPeerConnection(peerId);
        const channel = pc.createDataChannel("chat");
        this.setupDataChannel(peerId, channel);

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        this.socket.emit("p2p_signal", {
            to: peerId,
            from: this.currentUserId,
            signal: offer,
            type: "offer"
        });
    }

    private async handleOffer(peerId: string, offer: RTCSessionDescriptionInit) {
        const pc = await this.createPeerConnection(peerId);
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        this.socket.emit("p2p_signal", {
            to: peerId,
            from: this.currentUserId,
            signal: answer,
            type: "answer"
        });
    }

    private async handleAnswer(peerId: string, answer: RTCSessionDescriptionInit) {
        const pc = this.peers.get(peerId);
        if (pc) {
            await pc.setRemoteDescription(new RTCSessionDescription(answer));
        }
    }

    private async handleIceCandidate(peerId: string, candidate: RTCIceCandidateInit) {
        const pc = this.peers.get(peerId);
        if (pc) {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
        }
    }

    public sendMessage(peerId: string, message: P2PMessage) {
        const channel = this.dataChannels.get(peerId);
        if (channel && channel.readyState === "open") {
            channel.send(JSON.stringify(message));
            return true;
        }
        return false;
    }

    public async sendFile(peerId: string, file: File, onProgress?: (p: number) => void) {
        const channel = this.dataChannels.get(peerId);
        if (!channel || channel.readyState !== "open") return false;

        const CHUNK_SIZE = 16384; // 16KB chunks
        const fileId = Math.random().toString(36).substring(7);
        const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

        // Notify start
        channel.send(JSON.stringify({
            type: "file_start",
            file_id: fileId,
            file_name: file.name,
            total_chunks: totalChunks,
            size: file.size
        }));

        const buffer = await file.arrayBuffer();
        for (let i = 0; i < totalChunks; i++) {
            const start = i * CHUNK_SIZE;
            const end = Math.min(start + CHUNK_SIZE, file.size);
            const chunk = buffer.slice(start, end);

            // Structure: [fileIdLen(1)][fileId(...)][chunkIndex(4)][data(...)]
            const fileIdBytes = new TextEncoder().encode(fileId);
            const header = new ArrayBuffer(5 + fileIdBytes.length);
            const view = new DataView(header);
            view.setUint8(0, fileIdBytes.length);
            new Uint8Array(header, 1, fileIdBytes.length).set(fileIdBytes);
            view.setUint32(1 + fileIdBytes.length, i);

            const packet = new Uint8Array(header.byteLength + chunk.byteLength);
            packet.set(new Uint8Array(header), 0);
            packet.set(new Uint8Array(chunk), header.byteLength);

            // Wait if buffer is full
            while (channel.bufferedAmount > channel.bufferedAmountLowThreshold) {
                await new Promise(r => setTimeout(r, 10));
            }

            channel.send(packet);
            const progress = Math.round(((i + 1) / totalChunks) * 100);
            onProgress?.(progress);
            this.onFileProgress?.(peerId, file.name, progress);
        }

        return true;
    }

    public disconnectAll() {
        this.peers.forEach(pc => pc.close());
        this.peers.clear();
        this.dataChannels.clear();
    }
}
