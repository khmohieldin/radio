import { initializeApp } from "[https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js](https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js)";
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from "[https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js](https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js)";
import { getFirestore, doc, setDoc, onSnapshot, updateDoc, increment, collection, addDoc, getDocs, deleteDoc } from "[https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js](https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js)";

// تضمين Firebase Analytics (التحسين الاحترافي للتتبع)
import { getAnalytics } from "[https://www.gstatic.com/firebasejs/11.6.1/firebase-analytics.js](https://www.gstatic.com/firebasejs/11.6.1/firebase-analytics.js)";

// دالة تشفير كلمة المرور لحمايتها (SHA-256)
async function hashPassword(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// الحماية الحقيقية للمشروع تتم من خلال إعداد "Firestore Security Rules" من لوحة تحكم Firebase.
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {
    apiKey: "AIzaSyBnPCi3d1U_2IFd7uJfX2OJ50e6ZGpyXd0",
    authDomain: "caopy-6a424.firebaseapp.com",
    projectId: "caopy-6a424",
    storageBucket: "caopy-6a424.firebasestorage.app",
    messagingSenderId: "633633314629",
    appId: "1:633633314629:web:a134ea89facc28d2ced02c",
    measurementId: "G-1JHK9RF07B"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// تفعيل الإحصائيات (Analytics)
let analytics;
try {
    analytics = getAnalytics(app);
} catch(e) {
    console.warn("تنبيه: لم يتم تفعيل Analytics", e);
}

const appId = typeof __app_id !== 'undefined' ? __app_id : 'tiktok-radio-app';

lucide.createIcons();

const SVG_PLAY = `<svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="ml-1"><polygon points="6 3 20 12 6 21 6 3"></polygon></svg>`;
const SVG_PAUSE = `<svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="14" y="4" width="4" height="16" rx="1"></rect><rect x="6" y="4" width="4" height="16" rx="1"></rect></svg>`;

window.showToast = (message, type = 'info') => {
    const toastContainer = document.getElementById('toast-container');
    if (!toastContainer) return;
    const toast = document.createElement('div');
    const bgColor = type === 'error' ? 'bg-red-500/90' : type === 'success' ? 'bg-emerald-500/90' : 'bg-cyan-500/90';
    const icon = type === 'error' ? 'alert-triangle' : type === 'success' ? 'check-circle' : 'info';
    
    toast.className = `flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl text-white ${bgColor} animate-[slideIn_0.3s_ease-out]`;
    toast.innerHTML = `<i data-lucide="${icon}" class="w-5 h-5"></i><span class="font-medium text-sm">${message}</span>`;
    
    toastContainer.appendChild(toast);
    lucide.createIcons({ root: toast });

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(100%)';
        toast.style.transition = 'all 0.3s';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
};

let groups = [{ id: 'main', name: 'الرئيسية', tracks: [] }];
let localQueue = JSON.parse(localStorage.getItem('my_local_queue') || '[]'); 

let introTrack = null; 
let introPlayed = sessionStorage.getItem('introPlayed') === 'true'; 

let defaultCover = ''; 
let aboutUsText = ''; 

// تم استبدال كلمة المرور الصريحة (Plain Text) بالـ Hash الخاص بها للحماية.
// الـ Hash الافتراضي أدناه يمثل كلمة المرور القديمة ''.
let adminPasswordHash = 'f6392d475017045b85a3717dfb11de54fc911b2fc8d68dcb89bbdc77b311746f'; 

let autoSkipSeconds = 20; 
let playlistBgColor = '#1a1a1a';

let globalVisits = 0;
let totalTracksPlayed = 0; 
let globalTrackPlays = {}; 
let tickerSpeed = parseInt(localStorage.getItem('radio_ticker_speed') || '30');

let viewingGroupId = 'main'; 
let playingGroupId = null;   

let currentIndex = -1; // -2 Quran, -3 Intro, -4 Drama Mix
let isPlaying = false;
let isLooping = false;
let isLoading = false;
let user = null;
let volume = 1;
let pendingRestoreTime = false;
let isDraggingProgress = false;
let draggedIndex = -1; 
let lastPlayedTrackId = null; 
let audioLoadTimeout; 

let isDropdownOpen = false; 
let isAdmin = localStorage.getItem('radioAdmin') === 'true'; 
let searchQuery = '';

const audio = document.getElementById('audio-player');

window.startIntro = () => {
    const introOverlay = document.getElementById('intro-overlay');
    if (introOverlay) {
        introOverlay.classList.add('opacity-0');
        setTimeout(() => {
            introOverlay.classList.add('hidden');
            introOverlay.classList.remove('flex');
        }, 500);
    }
    
    if (currentIndex === -3) {
        window.initAudioBooster();
        window.safePlayAudio();
    } else if (audio && audio.paused && introTrack && !introPlayed) {
        window.safeChangeTrack(introTrack.audioUrl);
        window.initAudioBooster();
        window.safePlayAudio();
    }
};

window.safePlayAudio = function() {
    if (!audio) return;
    if (!audio.getAttribute('src') && !window.hlsPlayer && !audio.currentSrc) return;
    if (audio.src === window.location.href) return; 

    const playPromise = audio.play();
    if (playPromise !== undefined) {
        playPromise.catch(error => {
            if (error.name !== 'AbortError' && error.name !== 'NotSupportedError') {
                console.error("خطأ في التشغيل:", error);
            }
        });
    }
};

window.safeChangeTrack = function(newSrc) {
    if(audio) {
        audio.pause();
        audio.removeAttribute('src'); 
        
        // منع memory leak عبر تنظيف مشغل HLS بشكل صحيح في كل مرة يتم تغيير المقطع
        if(window.hlsPlayer) {
            window.hlsPlayer.destroy();
            window.hlsPlayer = null;
        }
        
        if (!newSrc || newSrc.trim() === '') {
            return; 
        }
        
        // الاعتماد على CORS إذا كان مدعوماً لكي يعمل محلل الطيف الصوتي (Visualizer)
        audio.setAttribute('crossorigin', 'anonymous'); 
        
        if (newSrc.includes('.m3u8')) {
            if (typeof Hls !== 'undefined' && Hls.isSupported()) {
                window.hlsPlayer = new Hls();
                window.hlsPlayer.loadSource(newSrc);
                window.hlsPlayer.attachMedia(audio);
            } else if (audio.canPlayType('application/vnd.apple.mpegurl')) {
                audio.src = newSrc;
                audio.load();
            } else {
                window.showToast('متصفحك لا يدعم هذا النوع من البث المباشر.', 'error');
            }
        } else {
            audio.src = newSrc;
            audio.load();
        }
    }
};

window.playQuranRadio = () => {
    playingGroupId = null;
    currentIndex = -2; 
    localStorage.setItem('lastTrackIndex', -2);
    localStorage.removeItem('lastPlayingGroupId');

    window.safeChangeTrack('[https://stream.radiojar.com/8s5u5tpdtwzuv](https://stream.radiojar.com/8s5u5tpdtwzuv)'); 
    pendingRestoreTime = false;
    window.initAudioBooster();
    
    window.safePlayAudio();
    window.updatePlayerUI();
};

window.playDramaMixRadio = async () => {
    playingGroupId = null;
    currentIndex = -4; 
    localStorage.setItem('lastTrackIndex', -4);
    localStorage.removeItem('lastPlayingGroupId');

    const pageUrl = '[https://mixmix.neocities.org/fm/drama](https://mixmix.neocities.org/fm/drama)';
    window.safeChangeTrack(''); 
    
    const titleEl = document.getElementById('track-title');
    if (titleEl) titleEl.innerText = '⏳ جاري استخراج البث المباشر...';
    window.updatePlayerUI();

    try {
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(pageUrl)}`;
        const res = await fetch(proxyUrl);
        const data = await res.json();
        const htmlContent = data.contents;

        let streamUrl = null;

        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlContent, 'text/html');
        const audioEl = doc.querySelector('audio source') || doc.querySelector('audio');
        
        if (audioEl && audioEl.src) {
            streamUrl = audioEl.src;
        } else {
            const broadRegex = /(https?:\/\/[^\s"'<>]+(?:\.m3u8|\.mp3|zeno\.fm|radiojar|stream|live|listen)[^\s"'<>]*)/i;
            const match = htmlContent.match(broadRegex);
            if (match && match[1]) {
                streamUrl = match[1];
            }
        }

        if (streamUrl && streamUrl.startsWith('/')) {
            streamUrl = new URL(streamUrl, pageUrl).href;
        }

        if (streamUrl) {
            window.safeChangeTrack(streamUrl);
            pendingRestoreTime = false;
            window.initAudioBooster();
            window.safePlayAudio();
            if (titleEl) titleEl.innerText = 'دراما ميكس';
        } else {
            throw new Error('لم يتم العثور على رابط بث مدعوم في الصفحة.');
        }

    } catch (err) {
        console.error("Scraping Error:", err);
        window.showToast('تعذر استخراج البث من الموقع المرجعي', 'error');
        if (titleEl) titleEl.innerText = '❌ خطأ في البث المباشر';
    }
};

window.fetchLinkInfo = async function(url) {
    const isTikTok = url.includes('tiktok.com');
    const isArchive = url.includes('archive.org/details/');
    const isYouTube = url.includes('youtube.com') || url.includes('youtu.be');
    const isSoundCloud = url.includes('soundcloud.com');
    
    if (!isTikTok && !isArchive && !isYouTube && !isSoundCloud) {
        throw new Error('يرجى إدخال رابط صحيح (تيك توك، أرشيف، يوتيوب، ساوند كلاود).');
    }

    if (isTikTok) {
        const res = await fetch(`https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`);
        const json = await res.json();
        if (json.code === 0 && json.data) {
            return [{
                id: json.data.id,
                url: url,
                title: json.data.title || 'مقطع تيك توك',
                author: json.data.author.nickname || 'مستخدم',
                audioUrl: json.data.play, 
                cover: json.data.cover,
                details: '',
                customCover: '',
                addedAt: Date.now()
            }];
        } else {
            throw new Error('لم نتمكن من جلب المقطع من تيك توك.');
        }
    } else if (isArchive) {
        const match = url.match(/archive\.org\/details\/([^\/\?#]+)/);
        if (!match) throw new Error('رابط الأرشيف غير صالح');
        const archiveId = match[1];

        const res = await fetch(`https://archive.org/metadata/${archiveId}`);
        const json = await res.json();

        if (json && json.files && json.files.length > 0) {
            const audioFiles = json.files.filter(f => 
                f.name.toLowerCase().endsWith('.mp3') || 
                f.name.toLowerCase().endsWith('.m4a') || 
                f.format === 'VBR MP3' || 
                f.format === 'MP3'
            );

            if (audioFiles.length > 0) {
                let creator = 'Archive.org';
                if (json.metadata.creator) {
                    creator = Array.isArray(json.metadata.creator) ? json.metadata.creator.join(', ') : json.metadata.creator;
                } else if (json.metadata.title) {
                    creator = json.metadata.title;
                }

                const uniqueTracks = [];
                const seenTitles = new Set();

                for (const file of audioFiles) {
                    const title = file.title || file.name.replace(/\.[^/.]+$/, "");
                    const normalizedTitle = title.trim().toLowerCase();

                    if (!seenTitles.has(normalizedTitle)) {
                        seenTitles.add(normalizedTitle);
                        uniqueTracks.push({
                            id: `${archiveId}_${Date.now()}_${uniqueTracks.length}`,
                            url: url,
                            title: title, 
                            author: creator,
                            audioUrl: `https://archive.org/download/${archiveId}/${file.name}`,
                            cover: `https://archive.org/services/img/${archiveId}`,
                            details: '',
                            customCover: '',
                            addedAt: Date.now() + uniqueTracks.length
                        });
                    }
                }
                uniqueTracks.sort((a, b) => a.title.localeCompare(b.title, undefined, { numeric: true, sensitivity: 'base' }));
                uniqueTracks.forEach((track, index) => { track.addedAt = Date.now() + index; });
                return uniqueTracks;
            } else {
                throw new Error('لم يتم العثور على ملفات صوتية مدعومة.');
            }
        } else {
            throw new Error('فشل جلب بيانات الأرشيف.');
        }
    } else if (isYouTube || isSoundCloud) {
        let audioUrl = '';
        let title = isYouTube ? 'مقطع يوتيوب' : 'مقطع ساوند كلاود';
        let author = 'مستخدم';
        let coverUrl = '';

        try {
            const noembedRes = await fetch(`https://noembed.com/embed?url=${url}`);
            const noembedData = await noembedRes.json();
            if(noembedData.title) title = noembedData.title;
            if(noembedData.author_name) author = noembedData.author_name;
            if(noembedData.thumbnail_url) coverUrl = noembedData.thumbnail_url;
        } catch(e) {}

        const fetchers = [];
        const targetUrl = isSoundCloud ? url.split('?')[0] : url; 
        
        const cobaltInstances = [
            '[https://co.wuk.sh](https://co.wuk.sh)', '[https://api.zmrz.nl](https://api.zmrz.nl)', '[https://cobalt.csthub.cc](https://cobalt.csthub.cc)',
            '[https://cobalt-api.kwiatekit.com](https://cobalt-api.kwiatekit.com)', '[https://cobalt.seasi.dev](https://cobalt.seasi.dev)', '[https://cobalt.j02.xyz](https://cobalt.j02.xyz)'
        ];

        const cobaltBody = JSON.stringify({ url: targetUrl, isAudioOnly: true, downloadMode: 'audio', aFormat: 'mp3' });
        const cobaltHeaders = { 'Accept': 'application/json', 'Content-Type': 'application/json' };

        cobaltInstances.forEach(instance => {
            fetchers.push(async () => {
                const r = await fetch(`${instance}/api/json`, { method: 'POST', headers: cobaltHeaders, body: cobaltBody });
                const d = await r.json(); return d?.url;
            });
        });
        
        if (isYouTube) {
            fetchers.push(
                async () => { const r = await fetch(`https://api.vreden.my.id/api/ytmp3?url=${encodeURIComponent(targetUrl)}`); const d = await r.json(); return d?.result?.download?.url || d?.result?.url; },
                async () => { const r = await fetch(`https://api.siputzx.my.id/api/d/ytmp3?url=${encodeURIComponent(targetUrl)}`); const d = await r.json(); return d?.data?.dl || d?.data?.url; },
                async () => { const r = await fetch(`https://api.ryzendesu.vip/api/downloader/ytmp3?url=${encodeURIComponent(targetUrl)}`); const d = await r.json(); return d?.url || d?.data?.url; }
            );
        } else if (isSoundCloud) {
            const scClientIds = ['YUKXoArHAw1iwbA7iA6wXyIXXNfCrb6g', 'tQUb6PZc5t7tU2bX1qT297k9r4sXp2R3', 'a3e059563d7fd3372b49b37f00a00bcf'];
            scClientIds.forEach(cid => {
                fetchers.unshift(async () => { 
                    const res = await fetch(`https://api-v2.soundcloud.com/resolve?url=${encodeURIComponent(targetUrl)}&client_id=${cid}`);
                    if (!res.ok) throw new Error('SC Resolve Failed');
                    const data = await res.json();
                    const progressive = data.media?.transcodings?.find(t => t.format.protocol === 'progressive') || data.media?.transcodings?.[0];
                    if (progressive?.url) {
                        const streamRes = await fetch(`${progressive.url}?client_id=${cid}`);
                        const streamData = await streamRes.json();
                        return streamData?.url;
                    }
                    return null;
                });
            });
            fetchers.push(
                async () => { const r = await fetch(`https://api.vreden.my.id/api/soundcloud?url=${encodeURIComponent(targetUrl)}`); const d = await r.json(); return d?.result?.download || d?.result?.url; },
                async () => { const r = await fetch(`https://api.agatz.xyz/api/soundcloud?url=${encodeURIComponent(targetUrl)}`); const d = await r.json(); return d?.data?.url || d?.data?.download; },
                async () => { const r = await fetch(`https://aemt.me/soundcloud?url=${encodeURIComponent(targetUrl)}`); const d = await r.json(); return d?.result || d?.url; },
                async () => { const r = await fetch(`https://api.nyxs.pw/dl/sc?url=${encodeURIComponent(targetUrl)}`); const d = await r.json(); return d?.result?.url || d?.url; },
                async () => { const r = await fetch(`https://api.siputzx.my.id/api/d/soundcloud?url=${encodeURIComponent(targetUrl)}`); const d = await r.json(); return d?.data?.dl || d?.data?.url; }
            );
        }

        for (let fn of fetchers) {
            try {
                audioUrl = await fn();
                if (audioUrl && typeof audioUrl === 'string' && (audioUrl.startsWith('http://') || audioUrl.startsWith('https://'))) break; 
                audioUrl = ''; 
            } catch (e) {}
        }

        if (!audioUrl && isSoundCloud) {
            try {
                const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent('https://api-v2.soundcloud.com/resolve?url=' + encodeURIComponent(targetUrl) + '&client_id=YUKXoArHAw1iwbA7iA6wXyIXXNfCrb6g')}`;
                const pRes = await fetch(proxyUrl);
                const pData = await pRes.json();
                const pProg = pData.media?.transcodings?.find(t => t.format.protocol === 'progressive') || pData.media?.transcodings?.[0];
                if (pProg?.url) {
                    const streamRes = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(pProg.url + '?client_id=YUKXoArHAw1iwbA7iA6wXyIXXNfCrb6g')}`);
                    const streamData = await streamRes.json();
                    if (streamData?.url) audioUrl = streamData.url;
                }
            } catch (err) {
                console.error('Proxy fallback failed', err);
            }
        }

        if (!audioUrl) throw new Error('فشل استخراج الرابط أو المقطع خاص.');

        return [{
            id: `ytsc_${Date.now()}`,
            url: url,
            title: title,
            author: author,
            audioUrl: audioUrl, 
            cover: coverUrl,
            details: '',
            customCover: '',
            addedAt: Date.now()
        }];
    }
    return [];
};

window.setupIntroTrackPrompt = function() {
    window.openPromptModal('هوية الإذاعة (مقطع البداية)', 'ضع رابط التيك توك أو غيره هنا، أو اتركه فارغاً للحذف', async (url) => {
        if(!url || url.trim() === '') {
            introTrack = null;
            window.saveToDB();
            window.showToast('تم إزالة تتر البداية بنجاح', 'info');
            return;
        }
        
        window.showToast('جاري سحب وتحضير تتر البداية...', 'info');
        try {
            const tracks = await window.fetchLinkInfo(url.trim());
            if (tracks && tracks.length > 0) {
                window.openPromptModal('تأكيد اسم تتر البداية:', 'أدخل الاسم', (finalTitle) => {
                    introTrack = tracks[0];
                    introTrack.title = finalTitle || introTrack.title;
                    window.saveToDB();
                    window.showToast('تم تعيين تتر البداية بنجاح! سيتم تشغيله للزوار عند الدخول.', 'success');
                }, tracks[0].title);
            }
        } catch (e) {
            window.showToast('خطأ: ' + e.message, 'error');
        }
    });
};

window.editPlaylistBgColor = function() {
    window.openColorModal('تغيير لون خلفية صندوق المقاطع:', (newColor) => {
        playlistBgColor = newColor;
        const pbBox = document.getElementById('playlist-main-container');
        if (pbBox) pbBox.style.backgroundColor = playlistBgColor;
        window.saveToDB();
        window.showToast('تم تغيير لون الخلفية وحفظه للجميع بنجاح', 'success');
    }, playlistBgColor);
};

window.autoRefreshTrack = async function(track, group, index) {
    window.showToast('الرابط انتهت صلاحيته... جاري تجديد المقطع تلقائياً 🔄', 'info');
    const titleEl = document.getElementById('track-title');
    if (titleEl) titleEl.innerText = '🔄 جاري التجديد التلقائي...';
    
    try {
        const refreshedTracks = await window.fetchLinkInfo(track.url);
        if (refreshedTracks && refreshedTracks.length > 0 && refreshedTracks[0].audioUrl) {
            track.audioUrl = refreshedTracks[0].audioUrl;
            track.isRefreshing = false;
            
            if (group && !group.isLocal && isAdmin && user) window.saveToDB(); 
            
            if ((group && playingGroupId === group.id && currentIndex === index) || (currentIndex === -3 && track === introTrack)) {
                window.showToast('تم التجديد بنجاح! جاري التشغيل ✅', 'success');
                if (titleEl) titleEl.innerText = track.title;
                window.safeChangeTrack(track.audioUrl);
                window.initAudioBooster();
                window.safePlayAudio();
            }
        } else {
            throw new Error('Failed to refresh');
        }
    } catch(e) {
        track.isRefreshing = false;
        window.showToast('فشل التجديد التلقائي، يرجى إعادة إضافة المقطع', 'error');
        if (titleEl) titleEl.innerText = '❌ خطأ في التشغيل';
    }
};

if(audio) {
    audio.addEventListener('error', () => {
        if (audio.error && (audio.error.code === 4 || audio.error.code === 3)) { 
            if (currentIndex === -3 && introTrack) {
                 if (!introTrack.isRefreshing) {
                     introTrack.isRefreshing = true;
                     window.autoRefreshTrack(introTrack, null, -3);
                     return;
                 }
            } else {
                const currentGroup = window.getPlayingGroup();
                if (currentGroup && currentIndex >= 0) {
                    const track = currentGroup.tracks[currentIndex];
                    if (track && track.url && (track.url.includes('soundcloud.com') || track.url.includes('youtube.com') || track.url.includes('youtu.be') || track.url.includes('tiktok.com'))) {
                        if (!track.isRefreshing) {
                            track.isRefreshing = true;
                            console.warn("الرابط منتهي، جاري التجديد التلقائي...");
                            window.autoRefreshTrack(track, currentGroup, currentIndex);
                            return; 
                        }
                    }
                }
            }

            if (audio.getAttribute('crossorigin')) {
                // إزالة خاصية crossorigin كحل أخير إذا كانت تسبب المشكلة بسبب سياسات الخوادم الخارجية
                audio.removeAttribute('crossorigin');
                const currentSrc = audio.src;
                audio.removeAttribute('src');
                
                if (currentSrc && currentSrc !== window.location.href) {
                    audio.src = currentSrc; 
                    audio.load();
                    window.safePlayAudio();
                } else {
                    window.showToast('حدثت مشكلة في التشغيل', 'error');
                    const titleEl = document.getElementById('track-title');
                    if (titleEl) titleEl.innerText = '❌ خطأ في التشغيل';
                    
                    if (currentIndex === -3) {
                        if(audio) { audio.pause(); audio.removeAttribute('src'); }
                        currentIndex = -1;
                        playingGroupId = null;
                        isPlaying = false;
                        window.updatePlayerUI();
                    }
                }
            }
        }
    });

    audio.addEventListener('waiting', () => {
        if (currentIndex !== -2 && currentIndex !== -4) {
            const titleEl = document.getElementById('track-title');
            if (titleEl) titleEl.innerText = '⏳ جاري التحضير...';
        }
    });

    audio.addEventListener('playing', () => {
        clearTimeout(audioLoadTimeout); 
        window.updatePlayerUI();
    });
}

const linkInput = document.getElementById('link-input');
const btnSubmit = document.getElementById('btn-submit');
const errorMsg = document.getElementById('error-msg');
const linkForm = document.getElementById('link-form');

const playlistContainer = document.getElementById('playlist-container');
const playlistCount = document.getElementById('playlist-count');
const groupsContainer = document.getElementById('groups-container');

const coverContainer = document.getElementById('cover-container');
const trackCover = document.getElementById('track-cover');
const defaultIcon = document.getElementById('default-icon');
const trackTitle = document.getElementById('track-title');
const trackAuthor = document.getElementById('track-author');
const playingGlow = document.getElementById('playing-glow');
const playingGroupBadge = document.getElementById('playing-group-badge');

const btnPlayPause = document.getElementById('btn-play-pause');
const btnNext = document.getElementById('btn-next');
const btnPrev = document.getElementById('btn-prev');
const btnLoop = document.getElementById('btn-loop');
const btnRestart = document.getElementById('btn-restart');

const downloadContainer = document.getElementById('download-container');
const downloadBtnEl = document.getElementById('btn-download');

const trackDetailsContainer = document.getElementById('track-details-container');
const trackDetailsText = document.getElementById('track-details-text');

const currentTimeTxt = document.getElementById('current-time-txt');
const durationTxt = document.getElementById('duration-txt');
const progressContainer = document.getElementById('progress-container');
const progressBar = document.getElementById('progress-bar');
const volumeSlider = document.getElementById('volume-slider');
const volumeText = document.getElementById('volume-text');
const volumeIcon = document.getElementById('volume-icon');
const btnMute = document.getElementById('btn-mute');

const modalOverlay = document.getElementById('modal-overlay');
const modalContent = document.getElementById('modal-content');

const visualizerCanvas = document.getElementById('visualizer');
const canvasCtx = visualizerCanvas ? visualizerCanvas.getContext('2d') : null;
let animationId;

// ==================
// وظائف القائمة الخاصة (My Local Queue)
// ==================
window.addToQueue = (e, trackId) => {
    e.stopPropagation();
    let trackObj = null;
    
    for (let g of groups) {
        const found = g.tracks.find(t => t.id === trackId);
        if (found) { trackObj = { ...found }; break; } 
    }
    
    if (trackObj) {
        trackObj.queueId = 'q_' + Date.now() + Math.random().toString(36).substring(2);
        localQueue.push(trackObj);
        localStorage.setItem('my_local_queue', JSON.stringify(localQueue));
        window.showToast('تم إضافة المقطع لقائمتك الخاصة بنجاح 🎵', 'success');
        if (viewingGroupId === 'local_queue') window.renderPlaylist();
    }
};

window.removeFromQueue = (e, index) => {
    e.stopPropagation();
    localQueue.splice(index, 1);
    localStorage.setItem('my_local_queue', JSON.stringify(localQueue));
    
    if (playingGroupId === 'local_queue') {
        if (currentIndex === index) {
            if (localQueue.length > 0) {
                const nextIndex = index >= localQueue.length ? 0 : index;
                window.playTrack(nextIndex);
            } else {
                if(audio) { audio.pause(); audio.removeAttribute('src'); }
                currentIndex = -1;
                playingGroupId = null;
                isPlaying = false;
                window.updatePlayerUI();
            }
        } else if (index < currentIndex) {
            currentIndex--;
        }
    }
    window.renderPlaylist();
};

window.clearQueue = () => {
    if(!confirm('هل أنت متأكد من مسح جميع المقاطع من قائمتك الخاصة؟')) return;
    localQueue = [];
    localStorage.setItem('my_local_queue', JSON.stringify(localQueue));
    if (playingGroupId === 'local_queue') {
        if(audio) { audio.pause(); audio.removeAttribute('src'); }
        currentIndex = -1;
        playingGroupId = null;
        isPlaying = false;
        window.updatePlayerUI();
    }
    window.renderPlaylist();
    window.showToast('تم مسح قائمتك الخاصة', 'info');
};

// ==================
// Media Session API
// ==================
function setupMediaSession() {
    if ('mediaSession' in navigator) {
        navigator.mediaSession.setActionHandler('play', () => {
            if (audio && audio.paused) {
                window.initAudioBooster();
                window.safePlayAudio();
            }
        });
        navigator.mediaSession.setActionHandler('pause', () => {
            if (audio && !audio.paused) {
                audio.pause();
            }
        });
        navigator.mediaSession.setActionHandler('previoustrack', () => {
            if (btnPrev && !btnPrev.disabled) btnPrev.click();
        });
        navigator.mediaSession.setActionHandler('nexttrack', () => {
            if (btnNext && !btnNext.disabled) btnNext.click();
        });
    }
}
setupMediaSession();

// ==================
// دوال المدير والحماية
// ==================
window.applyAdminMode = function() {
    const adminControls = document.getElementById('admin-controls-wrapper');
    const badge = document.getElementById('admin-badge');
    if (isAdmin) {
        if(adminControls) adminControls.classList.remove('hidden');
        if(badge) badge.classList.remove('hidden');
        const geminiInput = document.getElementById('gemini-api-key');
        if(geminiInput) geminiInput.value = localStorage.getItem('geminiApiKey') || '';
        
        const skipInput = document.getElementById('skip-seconds-input');
        if(skipInput) skipInput.value = autoSkipSeconds;
    } else {
        if(adminControls) adminControls.classList.add('hidden');
        if(badge) badge.classList.add('hidden');
    }
    window.renderGroups();
    window.renderPlaylist();
    window.updateTickerUI();
};

window.openAdminLoginModal = function() {
    if(modalContent) {
        modalContent.innerHTML = `
            <div class="flex items-center gap-3 mb-4 text-pink-400 border-b border-[#333] pb-4">
                <i data-lucide="shield-check" class="w-6 h-6"></i>
                <h3 class="text-xl font-bold text-white">تسجيل الدخول للإدارة</h3>
            </div>
            <div class="space-y-4 mb-6">
                <div>
                    <label class="block text-sm text-gray-400 mb-1">كلمة المرور</label>
                    <input type="password" id="admin-password" class="w-full bg-[#0a0a0a] border border-[#333] rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-pink-500 outline-none" placeholder="••••••••" dir="ltr">
                </div>
            </div>
            <div class="flex justify-end gap-3 mt-auto">
                <button onclick="closeModal()" class="px-5 py-2.5 rounded-lg text-gray-400 hover:bg-[#222] hover:text-white transition-colors">إلغاء</button>
                <button id="btn-submit-login" class="px-5 py-2.5 rounded-lg bg-gradient-to-r from-pink-600 to-pink-500 hover:from-pink-500 hover:to-pink-400 text-white font-medium transition-all shadow-lg shadow-pink-500/20 flex items-center gap-2">دخول</button>
            </div>
        `;
    }
    if(modalOverlay) modalOverlay.classList.remove('hidden');
    lucide.createIcons({ root: modalContent });
    
    const passInput = document.getElementById('admin-password');
    const submitLoginBtn = document.getElementById('btn-submit-login');

    if(passInput) passInput.focus();
    
    if(submitLoginBtn) {
        submitLoginBtn.addEventListener('click', window.submitAdminLogin);
    }

    if(passInput) {
        passInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') window.submitAdminLogin();
        });
    }
};

window.submitAdminLogin = async function() {
    const passwordEl = document.getElementById('admin-password');
    const password = passwordEl ? passwordEl.value.trim() : '';

    if (!password) {
        window.showToast('يرجى إدخال كلمة المرور', 'error');
        return;
    }

    const inputHash = await hashPassword(password);

    if (inputHash === adminPasswordHash) { 
        isAdmin = true;
        localStorage.setItem('radioAdmin', 'true'); 
        window.showToast('تم تسجيل الدخول بنجاح', 'success');
        window.applyAdminMode();
        window.closeModal();
    } else {
        window.showToast('كلمة المرور خاطئة!', 'error');
    }
};

window.lockAdmin = function() {
    isAdmin = false;
    localStorage.removeItem('radioAdmin');
    window.showToast('تم إغلاق غرفة التحكم', 'info');
    window.applyAdminMode();
};

window.changeAdminPassword = function() {
    window.openPromptModal('تغيير كلمة المرور:', 'أدخل كلمة المرور الجديدة...', async (newPass) => {
        if(newPass.trim() !== '') {
            adminPasswordHash = await hashPassword(newPass.trim());
            window.saveToDB();
            window.showToast('تم تغيير كلمة المرور وتشفيرها بنجاح', 'success');
        }
    });
};

window.changeSkipSeconds = function(val) {
    autoSkipSeconds = parseInt(val) || 0;
    window.saveToDB();
};

let clickCount = 0;
let clickTimer;
document.addEventListener('click', (e) => {
    if (isDropdownOpen && !e.target.closest('#custom-dropdown-container')) {
        isDropdownOpen = false;
        window.renderGroups();
    }

    if (e.target.closest('button') || e.target.closest('input') || e.target.closest('textarea') || e.target.closest('a') || e.target.closest('select')) {
        return;
    }
    
    clickCount++;
    clearTimeout(clickTimer);
    if (clickCount >= 5) {
        if (!isAdmin) {
            window.openAdminLoginModal();
        }
        clickCount = 0;
    } else {
        clickTimer = setTimeout(() => { clickCount = 0; }, 1000); 
    }
});

// ==================
// وظائف عامة وجلب المجموعات
// ==================
window.toggleDropdown = (e) => {
    if(e) e.stopPropagation();
    isDropdownOpen = !isDropdownOpen;
    window.renderGroups();
};

window.handleSearch = function(val) {
    searchQuery = val.toLowerCase().trim();
    window.renderPlaylist();
};

window.getViewingGroup = function() {
    if (viewingGroupId === 'local_queue') {
        return { id: 'local_queue', name: 'قائمة الاستماع الخاصة', tracks: localQueue, color: '#ec4899', isLocal: true };
    }
    return groups.find(g => g.id === viewingGroupId) || groups[0];
};

window.getPlayingGroup = function() {
    if (playingGroupId === 'local_queue') {
        return { id: 'local_queue', name: 'قائمة الاستماع الخاصة', tracks: localQueue, color: '#ec4899', isLocal: true };
    }
    return groups.find(g => g.id === playingGroupId);
};

window.formatTime = function(seconds) {
    if (isNaN(seconds) || !seconds) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
};

window.changeTickerSpeed = (val) => {
    tickerSpeed = val;
    localStorage.setItem('radio_ticker_speed', val);
    const textEl = document.getElementById('ticker-text');
    if (textEl) textEl.style.animationDuration = `${val}s`;
};

window.playSpecificTrack = (groupId, index) => {
    if (viewingGroupId !== groupId) {
        window.switchGroup(groupId);
    }
    window.playTrack(index);
};

window.updateTickerUI = () => {
    const textEl = document.getElementById('ticker-text');
    if (!textEl) return;
    
    const totalTracks = groups.reduce((acc, g) => acc + g.tracks.length, 0);
    const totalHours = (totalTracks * 3.5 / 60).toFixed(1); 
    
    let latestTime = 0;
    let lastAddedTrack = null;
    let lastAddedGroup = null;
    let lastAddedIndex = -1;

    let mostPlayedTrackId = null;
    let maxPlays = 0;
    for (const [id, count] of Object.entries(globalTrackPlays)) {
        if (count > maxPlays) {
            maxPlays = count;
            mostPlayedTrackId = id;
        }
    }

    let mostPlayedTrack = null;
    let mostPlayedGroup = null;
    let mostPlayedIndex = -1;

    for (let g of groups) {
        for (let i = 0; i < g.tracks.length; i++) {
            let t = g.tracks[i];
            
            if (t.addedAt && t.addedAt > latestTime) {
                latestTime = t.addedAt;
                lastAddedTrack = t;
                lastAddedGroup = g.id;
                lastAddedIndex = i;
            }
            
            if (mostPlayedTrackId && t.id === mostPlayedTrackId) {
                mostPlayedTrack = t;
                mostPlayedGroup = g.id;
                mostPlayedIndex = i;
            }
        }
    }

    if (latestTime === 0) {
        const activeGroup = window.getViewingGroup() || groups[0];
        if (activeGroup && activeGroup.tracks.length > 0 && !activeGroup.isLocal) {
            lastAddedTrack = activeGroup.tracks[0];
            lastAddedGroup = activeGroup.id;
            lastAddedIndex = 0;
        } else {
            for (let g of groups) {
                if (g.tracks.length > 0) {
                    lastAddedTrack = g.tracks[0];
                    lastAddedGroup = g.id;
                    lastAddedIndex = 0;
                    break;
                }
            }
        }
    }

    const lastAddedHtml = lastAddedTrack ? `<span class="cursor-pointer text-pink-400 hover:text-pink-300 hover:underline transition-colors px-1 font-bold" onclick="playSpecificTrack('${lastAddedGroup}', ${lastAddedIndex})">${lastAddedTrack.title}</span>` : 'لا يوجد';
    const mostPlayedHtml = mostPlayedTrack ? `<span class="cursor-pointer text-pink-400 hover:text-pink-300 hover:underline transition-colors px-1 font-bold" onclick="playSpecificTrack('${mostPlayedGroup}', ${mostPlayedIndex})">${mostPlayedTrack.title} (${maxPlays} مرة)</span>` : 'لا يوجد';

    const statsText = `📊 إحصائيات الموقع:  ✦  إجمالي المقاطع: ${totalTracks} مقطع  ✦  إجمالي الساعات (تقريبي): ${totalHours} ساعة  ✦  إجمالي مرات التشغيل: ${totalTracksPlayed} مرة حول العالم  ✦  إجمالي الزوار: ${globalVisits} زائر  ✦  أكثر مقطع تشغيلاً: ${mostPlayedHtml}  ✦  آخر مقطع مضاف: ${lastAddedHtml}`;
    
    textEl.innerHTML = statsText;
    textEl.style.animationDuration = `${tickerSpeed}s`;
    
    const speedSlider = document.getElementById('ticker-speed-slider');
    if (speedSlider) speedSlider.value = tickerSpeed;
};

window.setDefaultCoverUrl = () => {
    window.openPromptModal('تغيير الشعار الافتراضي:', 'أدخل رابط الصورة المباشر (http...)', (url) => {
        defaultCover = url;
        window.saveToDB();
        window.updatePlayerUI();
    }, defaultCover);
};

window.setTrackCoverUrl = (e, index) => {
    e.stopPropagation();
    const group = window.getViewingGroup();
    if (!group || !group.tracks[index] || group.isLocal) return;
    const currentCover = group.tracks[index].customCover || '';
    window.openPromptModal('تغيير صورة المقطع:', 'أدخل رابط الصورة المباشر (http...)', (url) => {
        group.tracks[index].customCover = url;
        window.saveToDB();
        window.updatePlayerUI();
    }, currentCover);
};

window.removeDefaultCover = () => {
     defaultCover = '';
     window.saveToDB();
     window.updatePlayerUI();
};

// ==================
// النوافذ المنبثقة (Modals) الأساسية
// ==================
window.closeModal = () => {
    if(modalOverlay) modalOverlay.classList.add('hidden');
};

window.openPromptModal = function(title, placeholder, onConfirm, initialValue = '') {
    if(!modalContent) return;
    modalContent.innerHTML = `
        <h3 class="text-lg font-bold text-white mb-4">${title}</h3>
        <input type="text" id="modal-input" class="w-full bg-[#0a0a0a] border border-[#333] rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-cyan-500 outline-none mb-6" placeholder="${placeholder}" value="${initialValue}" autocomplete="off" dir="auto">
        <div class="flex justify-end gap-3 mt-auto">
            <button onclick="closeModal()" class="px-5 py-2.5 rounded-lg text-gray-400 hover:bg-[#222] hover:text-white transition-colors">إلغاء</button>
            <button id="modal-confirm-btn" class="px-5 py-2.5 rounded-lg bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white font-medium transition-all shadow-lg shadow-cyan-500/20">تأكيد</button>
        </div>
    `;
    if(modalOverlay) modalOverlay.classList.remove('hidden');
    const inputField = document.getElementById('modal-input');
    if(inputField) {
        inputField.focus();
        if(initialValue) inputField.select();
        
        const confirmBtn = document.getElementById('modal-confirm-btn');
        if(confirmBtn) {
            confirmBtn.addEventListener('click', () => {
                const val = inputField.value.trim();
                if (val || val === '') { onConfirm(val); window.closeModal(); }
            });
        }
        
        inputField.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && confirmBtn) confirmBtn.click();
        });
    }
};

window.openColorModal = function(title, onConfirm, initialColor = '#06b6d4') {
    if(!modalContent) return;
    modalContent.innerHTML = `
        <h3 class="text-lg font-bold text-white mb-4">${title}</h3>
        <div class="flex items-center justify-center gap-4 mb-6">
            <input type="color" id="modal-color-input" class="w-24 h-24 rounded-2xl cursor-pointer bg-transparent border-0 p-0" value="${initialColor}">
        </div>
        <p class="text-sm text-gray-400 text-center mb-6">اختر اللون المميز لهذا القسم</p>
        <div class="flex justify-end gap-3 mt-auto">
            <button onclick="closeModal()" class="px-5 py-2.5 rounded-lg text-gray-400 hover:bg-[#222] hover:text-white transition-colors">إلغاء</button>
            <button id="modal-confirm-btn" class="px-5 py-2.5 rounded-lg bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white font-medium transition-all shadow-lg shadow-cyan-500/20">حفظ اللون</button>
        </div>
    `;
    if(modalOverlay) modalOverlay.classList.remove('hidden');
    
    const confirmBtn = document.getElementById('modal-confirm-btn');
    if(confirmBtn) {
        confirmBtn.addEventListener('click', () => {
            const colorInput = document.getElementById('modal-color-input');
            const val = colorInput ? colorInput.value : initialColor;
            onConfirm(val); 
            window.closeModal();
        });
    }
};

window.openMultiTrackModal = function(tracks, onConfirm) {
    if(!modalContent) return;
    const tracksHtml = tracks.map((t, index) => `
        <div class="mb-3">
            <label class="text-xs text-gray-400 mb-1 block">مقطع ${index + 1}</label>
            <input type="text" id="multi-track-${index}" class="w-full bg-[#0a0a0a] border border-[#333] rounded-xl px-3 py-2 text-white focus:ring-2 focus:ring-cyan-500 outline-none text-sm" value="${t.title}" dir="auto">
        </div>
    `).join('');

    modalContent.innerHTML = `
        <h3 class="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <i data-lucide="list-video" class="w-5 h-5 text-cyan-400"></i>
            تعديل العناوين قبل الحفظ (${tracks.length} مقاطع)
        </h3>
        <div class="max-h-[60vh] overflow-y-auto custom-scrollbar pr-2 mb-4">
            ${tracksHtml}
        </div>
        <div class="flex justify-end gap-3 mt-auto pt-4 border-t border-[#333]">
            <button onclick="closeModal()" class="px-5 py-2.5 rounded-lg text-gray-400 hover:bg-[#222] hover:text-white transition-colors">إلغاء</button>
            <button id="modal-confirm-btn" class="px-5 py-2.5 rounded-lg bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white font-medium transition-all shadow-lg shadow-cyan-500/20">حفظ المقاطع</button>
        </div>
    `;
    if(modalOverlay) modalOverlay.classList.remove('hidden');
    lucide.createIcons({ root: modalContent });

    const confirmBtn = document.getElementById('modal-confirm-btn');
    if(confirmBtn) {
        confirmBtn.addEventListener('click', () => {
            const updatedTracks = tracks.map((t, index) => {
                const inputEl = document.getElementById(`multi-track-${index}`);
                const inputVal = inputEl ? inputEl.value.trim() : '';
                return { ...t, title: inputVal || t.title };
            });
            onConfirm(updatedTracks);
            window.closeModal();
        });
    }
};

window.openTextareaModal = function(title, placeholder, onConfirm, initialValue = '') {
    if(!modalContent) return;
    modalContent.innerHTML = `
        <h3 class="text-lg font-bold text-white mb-4">${title}</h3>
        <textarea id="modal-textarea" class="w-full h-40 bg-[#0a0a0a] border border-[#333] rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-cyan-500 outline-none mb-6 resize-none custom-scrollbar" placeholder="${placeholder}">${initialValue}</textarea>
        <div class="flex justify-end gap-3 mt-auto">
            <button onclick="closeModal()" class="px-5 py-2.5 rounded-lg text-gray-400 hover:bg-[#222] hover:text-white transition-colors">إلغاء</button>
            <button id="modal-confirm-btn" class="px-5 py-2.5 rounded-lg bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white font-medium transition-all shadow-lg shadow-cyan-500/20">حفظ النص</button>
        </div>
    `;
    if(modalOverlay) modalOverlay.classList.remove('hidden');
    const inputField = document.getElementById('modal-textarea');
    if(inputField) inputField.focus();
    
    const confirmBtn = document.getElementById('modal-confirm-btn');
    if(confirmBtn) {
        confirmBtn.addEventListener('click', () => {
            const val = inputField ? inputField.value.trim() : '';
            onConfirm(val); 
            window.closeModal();
        });
    }
};

window.generateAIDetails = async function(trackTitle, currentDetails, btnElement, textareaElement) {
    const apiKey = localStorage.getItem('geminiApiKey') || ""; 
    const modelName = apiKey ? "gemini-1.5-flash" : "gemini-2.5-flash-preview-09-2025";
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

    const originalText = btnElement.innerHTML;
    btnElement.innerHTML = '<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> جاري التوليد...';
    btnElement.disabled = true;
    lucide.createIcons({ root: btnElement.parentElement });

    const promptText = `قم بتحسين وتنسيق تفاصيل هذا المقطع بشكل احترافي وجذاب ومختصر.
عنوان المقطع/المسلسل: ${trackTitle}
التفاصيل الحالية: ${currentDetails || 'لا يوجد'}

استخرج أو خمّن (إن أمكن بناء على العنوان) قصة مختصرة، وأسماء الممثلين، ونسقها بشكل نقاط واضحة واحترافية باللغة العربية، وبدون مقدمات أو خاتمة.`;

    const payload = {
        contents: [{ parts: [{ text: promptText }] }],
        systemInstruction: { parts: [{ text: "أنت مساعد ذكي لترتيب وتنسيق تفاصيل المسلسلات والمقاطع الإذاعية بشكل احترافي." }] }
    };

    let attempt = 0;
    const delays = [1000, 2000, 4000, 8000, 16000];

    while (attempt <= 5) {
        try {
            const res = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                const data = await res.json();
                const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;
                if (generatedText) {
                    if(textareaElement) textareaElement.value = generatedText.trim();
                    btnElement.innerHTML = originalText;
                    btnElement.disabled = false;
                    lucide.createIcons({ root: btnElement.parentElement });
                    return; 
                }
            }
        } catch (e) {
        }

        if (attempt < 5) {
            await new Promise(resolve => setTimeout(resolve, delays[attempt]));
        }
        attempt++;
    }
    
    alert('حدث خطأ أثناء التوليد. تأكد من إضافة مفتاح Gemini API في إعدادات غرفة التحكم إذا كنت تستخدم التطبيق خارج الموقع، وتأكد من اتصالك بالإنترنت.');
    btnElement.innerHTML = originalText;
    btnElement.disabled = false;
    lucide.createIcons({ root: btnElement.parentElement });
};

window.openDetailsModal = function(title, trackTitle, onConfirm, initialValue = '') {
    if(!modalContent) return;
    modalContent.innerHTML = `
        <div class="flex items-center justify-between mb-4 border-b border-[#333] pb-3">
            <h3 class="text-lg font-bold text-white truncate max-w-[60%]">${title}</h3>
            <button id="ai-gen-btn" class="flex items-center gap-1.5 px-3 py-1.5 bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-lg hover:bg-purple-500/30 transition-colors text-xs sm:text-sm font-medium whitespace-nowrap" title="ينسق ويولد التفاصيل بالذكاء الاصطناعي">
                <i data-lucide="sparkles" class="w-4 h-4"></i>
                تنسيق ذكي
            </button>
        </div>
        <textarea id="modal-textarea" class="w-full h-40 bg-[#0a0a0a] border border-[#333] rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-cyan-500 outline-none mb-6 resize-none custom-scrollbar" placeholder="اسم المسلسل: ...\nالممثلين: ...\nالوصف: ...">${initialValue}</textarea>
        <div class="flex justify-end gap-3 mt-auto">
            <button onclick="closeModal()" class="px-5 py-2.5 rounded-lg text-gray-400 hover:bg-[#222] hover:text-white transition-colors">إلغاء</button>
            <button id="modal-confirm-btn" class="px-5 py-2.5 rounded-lg bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white font-medium transition-all shadow-lg shadow-cyan-500/20">حفظ التفاصيل</button>
        </div>
    `;
    if(modalOverlay) modalOverlay.classList.remove('hidden');
    lucide.createIcons({ root: modalContent });
    const inputField = document.getElementById('modal-textarea');
    if(inputField) inputField.focus();
    
    const aiGenBtn = document.getElementById('ai-gen-btn');
    if(aiGenBtn) {
        aiGenBtn.addEventListener('click', function() {
            window.generateAIDetails(trackTitle, inputField ? inputField.value : '', this, inputField);
        });
    }

    const confirmBtn = document.getElementById('modal-confirm-btn');
    if(confirmBtn) {
        confirmBtn.addEventListener('click', () => {
            const val = inputField ? inputField.value.trim() : '';
            onConfirm(val); 
            window.closeModal();
        });
    }
};

window.openConfirmModal = function(message, onConfirm) {
    if(!modalContent) return;
    modalContent.innerHTML = `
        <div class="flex items-center gap-3 mb-4 text-red-400 border-b border-[#333] pb-4">
            <i data-lucide="alert-triangle" class="w-6 h-6"></i>
            <h3 class="text-lg font-bold text-white">تأكيد الحذف</h3>
        </div>
        <p class="text-gray-400 mb-6 leading-relaxed">${message}</p>
        <div class="flex justify-end gap-3 mt-auto">
            <button onclick="closeModal()" class="px-5 py-2.5 rounded-lg text-gray-400 hover:bg-[#222] hover:text-white transition-colors">إلغاء</button>
            <button id="modal-confirm-btn" class="px-5 py-2.5 rounded-lg bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-medium transition-all shadow-lg shadow-red-500/20">نعم، احذف</button>
        </div>
    `;
    lucide.createIcons({ root: modalContent });
    if(modalOverlay) modalOverlay.classList.remove('hidden');
    
    const confirmBtn = document.getElementById('modal-confirm-btn');
    if(confirmBtn) {
        confirmBtn.addEventListener('click', () => {
            onConfirm(); window.closeModal();
        });
    }
};

window.openAlertModal = function(title, message) {
    if(!modalContent) return;
    const formattedMessage = message.replace(/\n/g, '<br>');
    modalContent.innerHTML = `
        <div class="flex items-center gap-3 mb-4 text-cyan-400 border-b border-[#333] pb-4">
            <i data-lucide="info" class="w-6 h-6"></i>
            <h3 class="text-xl font-bold text-white">${title}</h3>
        </div>
        <div class="text-gray-300 mb-6 leading-relaxed max-h-60 overflow-y-auto custom-scrollbar pr-2 text-sm sm:text-base">
            ${formattedMessage}
        </div>
        <div class="flex justify-end mt-auto">
            <button onclick="closeModal()" class="px-6 py-2.5 rounded-xl bg-[#222] text-white hover:bg-[#333] border border-[#444] transition-colors font-medium">إغلاق</button>
        </div>
    `;
    lucide.createIcons({ root: modalContent });
    if(modalOverlay) modalOverlay.classList.remove('hidden');
};

// ==================
// وظائف الأزرار السفلية
// ==================
window.editAboutUs = function() {
    window.openTextareaModal('تعديل نص (من نحن):', 'اكتب معلومات عن الإذاعة...', (text) => {
        aboutUsText = text;
        window.saveToDB();
    }, aboutUsText);
};

window.showAboutUs = function() {
    window.openAlertModal('من نحن', aboutUsText || 'راديو خالد - رحلة إلى الزمن الجميل.\nلم يتم إضافة معلومات إضافية بعد.');
};

window.addToFavorites = () => {
    window.openAlertModal('المفضلة / الرئيسية', 'لإضافة الراديو للمفضلة أو جعله صفحتك الرئيسية:<br><br><b>للكمبيوتر:</b> اضغط على لوحة المفاتيح <span class="bg-[#333] px-2 py-1 rounded text-cyan-400 font-mono mx-1">Ctrl + D</span><br><br><b>للهاتف:</b> اضغط على أيقونة خيارات المتصفح (الثلاث نقاط) ثم علامة النجمة (⭐) أو اختر "إضافة للمفضلة".');
};

let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
});

window.installApp = async () => {
    if (window.matchMedia('(display-mode: standalone)').matches) {
        window.openAlertModal('تنبيه', 'التطبيق مثبت بالفعل على هاتفك! ابحث عن أيقونة "راديو خالد" في قائمة تطبيقاتك.');
        return;
    }
    
    if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            deferredPrompt = null;
        }
    } else {
        window.openAlertModal('تنزيل التطبيق', '💡 <b>ملاحظة هامة جداً:</b><br>إذا فتحت الرابط من تطبيق مثل (واتساب أو فيسبوك)، يرجى الضغط على الثلاث نقاط بالأعلى واختيار <b>(الفتح في متصفح كروم - Open in Chrome)</b> أولاً لتتمكن من التثبيت.<br><br><b>للتثبيت اليدوي:</b><br>1. اضغط على خيارات متصفح كروم (الثلاث نقاط).<br>2. اختر <b>"إضافة إلى الشاشة الرئيسية"</b> (Add to Home Screen) أو <b>"تثبيت التطبيق"</b> (Install App).<br>3. ستظهر الأيقونة بين برامجك فوراً!');
    }
};

window.openContactModal = function() {
    if(!modalContent) return;
    modalContent.innerHTML = `
        <div class="flex items-center justify-between mb-4 border-b border-[#333] pb-3">
            <h3 class="text-lg font-bold text-white flex items-center gap-2">
                <i data-lucide="mail" class="w-5 h-5 text-cyan-400"></i>
                تواصل معنا
            </h3>
        </div>
        <div class="space-y-4 mb-6">
            <div>
                <label class="block text-sm text-gray-400 mb-1">نوع الرسالة</label>
                <select id="contact-type" class="w-full bg-[#0a0a0a] border border-[#333] rounded-xl px-3 py-2 text-white focus:ring-2 focus:ring-cyan-500 outline-none">
                    <option value="اقتراح">اقتراح تطوير</option>
                    <option value="شكوى">تقديم شكوى</option>
                    <option value="طلب إضافة">طلب إضافة مسلسل/مقطع</option>
                    <option value="أخرى">أخرى</option>
                </select>
            </div>
            <div>
                <label class="block text-sm text-gray-400 mb-1">نص الرسالة</label>
                <textarea id="contact-message" class="w-full h-32 bg-[#0a0a0a] border border-[#333] rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-cyan-500 outline-none resize-none custom-scrollbar" placeholder="اكتب رسالتك وتفاصيل طلبك هنا..."></textarea>
            </div>
        </div>
        <div class="flex justify-end gap-3 mt-auto">
            <button onclick="closeModal()" class="px-5 py-2.5 rounded-lg text-gray-400 hover:bg-[#222] hover:text-white transition-colors">إلغاء</button>
            <button onclick="submitContactMessage()" id="modal-submit-contact" class="px-5 py-2.5 rounded-lg bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white font-medium transition-all shadow-lg shadow-cyan-500/20 flex items-center gap-2">إرسال <i data-lucide="send" class="w-4 h-4"></i></button>
        </div>
    `;
    if(modalOverlay) modalOverlay.classList.remove('hidden');
    lucide.createIcons({ root: modalContent });
};

window.submitContactMessage = async function() {
    if (!user) {
        alert('الرجاء الانتظار حتى يتم الاتصال بالسحابة...');
        return;
    }

    const typeEl = document.getElementById('contact-type');
    const msgEl = document.getElementById('contact-message');
    const type = typeEl ? typeEl.value : 'أخرى';
    const message = msgEl ? msgEl.value.trim() : '';
    const btn = document.getElementById('modal-submit-contact');

    if (!message) {
        alert('يرجى كتابة نص الرسالة أولاً.');
        return;
    }

    if(btn) {
        btn.disabled = true;
        btn.innerHTML = '<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> جاري الإرسال...';
        lucide.createIcons({ root: btn.parentElement });
    }

    try {
        const messagesRef = collection(db, 'artifacts', appId, 'public', 'data', 'messages');
        await addDoc(messagesRef, {
            type: type,
            message: message,
            timestamp: Date.now(),
            userId: user.uid
        });
        window.openAlertModal('تم الإرسال', 'تم إرسال رسالتك أو طلبك بنجاح!<br>شكراً لتواصلك معنا وسنعمل على مراجعته في أقرب وقت.');
    } catch (e) {
        console.error(e);
        alert('حدث خطأ أثناء الإرسال، تأكد من اتصالك بالإنترنت.');
        window.closeModal();
    }
};

window.openMessagesModal = async function() {
    if (!user) return;
    if (!modalContent) return;
    
    modalContent.innerHTML = `
        <div class="flex items-center justify-between mb-4 border-b border-[#333] pb-3">
            <h3 class="text-lg font-bold text-white flex items-center gap-2">
                <i data-lucide="inbox" class="w-5 h-5 text-blue-400"></i>
                رسائل وشكاوى الزوار
            </h3>
            <button onclick="closeModal()" class="text-gray-400 hover:text-white transition-colors">
                <i data-lucide="x" class="w-5 h-5"></i>
            </button>
        </div>
        <div id="messages-list" class="space-y-3 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2 mb-4">
            <div class="flex justify-center py-8"><i data-lucide="loader-2" class="w-6 h-6 animate-spin text-cyan-500"></i></div>
        </div>
        <div class="flex justify-end pt-4 border-t border-[#333]">
            <button onclick="closeModal()" class="px-5 py-2.5 rounded-lg bg-[#222] text-white hover:bg-[#333] border border-[#444] transition-colors font-medium">إغلاق</button>
        </div>
    `;
    if(modalOverlay) modalOverlay.classList.remove('hidden');
    lucide.createIcons({ root: modalContent });

    try {
        const messagesRef = collection(db, 'artifacts', appId, 'public', 'data', 'messages');
        const snapshot = await getDocs(messagesRef);
        const messagesList = document.getElementById('messages-list');
        if(!messagesList) return;
        
        if (snapshot.empty) {
            messagesList.innerHTML = '<p class="text-center text-gray-500 py-8">لا توجد رسائل حالياً.</p>';
            return;
        }

        let msgs = [];
        snapshot.forEach(doc => {
            msgs.push({ id: doc.id, ...doc.data() });
        });

        msgs.sort((a, b) => b.timestamp - a.timestamp);

        messagesList.innerHTML = msgs.map(msg => {
            const date = new Date(msg.timestamp).toLocaleString('ar-EG');
            const typeColor = msg.type === 'شكوى' ? 'text-red-400' : msg.type === 'اقتراح' ? 'text-green-400' : 'text-blue-400';
            return `
                <div class="bg-[#0a0a0a] border border-[#333] p-3 rounded-xl relative group">
                    <div class="flex justify-between items-start mb-2">
                        <span class="text-xs font-bold ${typeColor} bg-[#222] px-2 py-0.5 rounded border border-[#333]">${msg.type}</span>
                        <span class="text-[10px] text-gray-500 font-mono" dir="ltr">${date}</span>
                    </div>
                    <p class="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap mt-2">${msg.message}</p>
                    <button onclick="deleteMessage('${msg.id}')" class="absolute top-2 left-2 p-1.5 bg-red-500/10 text-red-500 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500 hover:text-white" title="حذف الرسالة">
                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                    </button>
                </div>
            `;
        }).join('');
        lucide.createIcons({ root: messagesList });

    } catch (e) {
        console.error("خطأ في جلب الرسائل", e);
        const messagesList = document.getElementById('messages-list');
        if(messagesList) messagesList.innerHTML = '<p class="text-center text-red-500 py-8">حدث خطأ في الاتصال وجلب الرسائل.</p>';
    }
};

window.deleteMessage = async function(msgId) {
    if(!confirm('هل أنت متأكد من حذف هذه الرسالة نهائياً؟')) return;
    try {
        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'messages', msgId));
        window.openMessagesModal(); 
    } catch(e) {
        console.error(e);
        alert('حدث خطأ أثناء الحذف');
    }
};

let audioCtx, gainNode, sourceNode, compressorNode, analyserNode;

window.initAudioBooster = function() {
    if (!audioCtx) {
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            audioCtx = new AudioContext();
            if(audio) sourceNode = audioCtx.createMediaElementSource(audio);
            
            compressorNode = audioCtx.createDynamicsCompressor();
            compressorNode.threshold.setValueAtTime(-24, audioCtx.currentTime);
            compressorNode.knee.setValueAtTime(30, audioCtx.currentTime);
            compressorNode.ratio.setValueAtTime(12, audioCtx.currentTime);
            compressorNode.attack.setValueAtTime(0.003, audioCtx.currentTime);
            compressorNode.release.setValueAtTime(0.25, audioCtx.currentTime);

            gainNode = audioCtx.createGain();
            
            analyserNode = audioCtx.createAnalyser();
            analyserNode.fftSize = 512; 

            if(sourceNode) sourceNode.connect(compressorNode);
            compressorNode.connect(gainNode);
            gainNode.connect(analyserNode);
            analyserNode.connect(audioCtx.destination);

            gainNode.gain.value = volume;
        } catch (e) {
            console.error("لم نتمكن من تفعيل معالجة الصوت:", e);
        }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume();
    }

    if (!animationId && visualizerCanvas && canvasCtx) {
        drawVisualizer();
    }
};

// تحسين الأداء (Throttling) لمحلل الطيف الصوتي (Visualizer) ليعمل بـ 30 إطار/ثانية
let lastDrawTime = performance.now();
function drawVisualizer(timestamp = performance.now()) {
    if (!analyserNode || !canvasCtx || !visualizerCanvas) return;
    animationId = requestAnimationFrame(drawVisualizer);

    // Throttle: عدم الرسم إلا بعد مرور حوالي 33 ملي ثانية (يعادل 30 FPS) لتوفير البطارية والمعالج
    if (timestamp - lastDrawTime < 33) return;
    lastDrawTime = timestamp;
    
    const bufferLength = analyserNode.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyserNode.getByteFrequencyData(dataArray);

    canvasCtx.clearRect(0, 0, visualizerCanvas.width, visualizerCanvas.height);

    if (!isPlaying && audio && audio.paused) {
        canvasCtx.fillStyle = 'rgba(6, 182, 212, 0.3)';
        canvasCtx.fillRect(0, visualizerCanvas.height - 2, visualizerCanvas.width, 2);
        return;
    }

    const halfCount = 32; 
    const barWidth = visualizerCanvas.width / (halfCount * 2);
    const centerX = visualizerCanvas.width / 2;

    const gradient = canvasCtx.createLinearGradient(0, visualizerCanvas.height, 0, 0);
    gradient.addColorStop(0, '#06b6d4');    
    gradient.addColorStop(0.5, '#f59e0b');  
    gradient.addColorStop(1, '#ef4444');    

    for (let i = 0; i < halfCount; i++) {
        let barHeight = Math.max((dataArray[i] / 255) * visualizerCanvas.height * 1.2, 2); 
        if (barHeight > visualizerCanvas.height) barHeight = visualizerCanvas.height;

        canvasCtx.fillStyle = gradient;
        
        let xRight = centerX + (i * barWidth);
        canvasCtx.fillRect(xRight, visualizerCanvas.height - barHeight, barWidth - 3, barHeight);

        let xLeft = centerX - ((i + 1) * barWidth);
        canvasCtx.fillRect(xLeft, visualizerCanvas.height - barHeight, barWidth - 3, barHeight);
    }
}

window.setCloudState = function(state, message) {
    const wrapper = document.getElementById('cloud-status-wrapper');
    if (wrapper) {
        let iconName = 'cloud';
        let iconClass = 'w-4 h-4 text-gray-500 animate-pulse';
        let textClass = 'text-[11px] font-mono text-gray-500';
        
        if (state === 'success') {
            iconClass = 'w-4 h-4 text-cyan-500';
            textClass = 'text-[11px] font-mono text-cyan-400';
        } else if (state === 'error') {
            iconName = 'cloud-off';
            iconClass = 'w-4 h-4 text-red-500';
            textClass = 'text-[11px] font-mono text-red-400';
        }
        
        wrapper.innerHTML = `
            <i data-lucide="${iconName}" class="${iconClass}"></i>
            <span class="${textClass}">${message}</span>
        `;
        lucide.createIcons({ root: wrapper });
    }
};

let unsubMain = null;
let unsubStats = null;

const initFirebaseAndAuth = async () => {
    try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
            await signInWithCustomToken(auth, __initial_auth_token);
        } else {
            await signInAnonymously(auth);
        }
    } catch (error) {
        console.error("Auth init error:", error);
        await signInAnonymously(auth).catch(console.error);
    }
};

// انتظار تهيئة المصادقة أولاً لحل مشكلة الأذونات (Permissions) بشكل قاطع
initFirebaseAndAuth().then(() => {
    onAuthStateChanged(auth, (currentUser) => {
        user = currentUser;
        if (!user) return; 

        window.applyAdminMode();
        setupFirestoreListeners();
    });
});

function setupFirestoreListeners() {
    if (!user) return;

    try {
        const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'shared_playlist', 'main');
        if (unsubMain) unsubMain();
        unsubMain = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists() && docSnap.data()) {
                const data = docSnap.data();
                
                defaultCover = data.defaultCover || '';
                if (data.aboutUsText !== undefined) {
                    aboutUsText = data.aboutUsText;
                }
                
                // تحميل الـ Hash الخاص بكلمة المرور المشفرة من القاعدة 
                if (data.adminPasswordHash !== undefined) {
                    adminPasswordHash = data.adminPasswordHash;
                } else if (data.adminPassword !== undefined) {
                     // التوافقية القديمة
                     hashPassword(data.adminPassword).then(h => adminPasswordHash = h);
                }
                
                if (data.autoSkipSeconds !== undefined) {
                    autoSkipSeconds = data.autoSkipSeconds;
                }
                
                if (data.introTrack !== undefined) {
                    introTrack = data.introTrack;
                }

                if (data.playlistBgColor !== undefined) {
                    playlistBgColor = data.playlistBgColor;
                    const pbBox = document.getElementById('playlist-main-container');
                    if (pbBox) pbBox.style.backgroundColor = playlistBgColor;
                }

                if (data.groups) {
                    groups = data.groups;
                } else if (data.tracks) {
                    groups = [{ id: 'main', name: 'الرئيسية', tracks: data.tracks }];
                }
                
                if (viewingGroupId !== 'local_queue' && !groups.find(g => g.id === viewingGroupId)) {
                    viewingGroupId = groups[0] ? groups[0].id : null;
                }

                window.applyAdminMode();
                
                if (introTrack && !introPlayed) {
                    sessionStorage.setItem('introPlayed', 'true');
                    introPlayed = true;

                    playingGroupId = 'intro';
                    currentIndex = -3;
                    
                    window.safeChangeTrack(introTrack.audioUrl);
                    window.initAudioBooster();
                    window.safePlayAudio();
                    
                    const playPromise = audio.play();
                    if (playPromise !== undefined) {
                        playPromise.catch(e => {
                            if (e.name !== 'AbortError') {
                                console.warn("المتصفح يمنع التشغيل التلقائي للصوت. سيتم تشغيل التتر عند أول تفاعل بالصفحة.");
                                const playOnInteract = () => {
                                    if (currentIndex === -3) {
                                        window.initAudioBooster();
                                        window.safePlayAudio();
                                    }
                                    document.removeEventListener('click', playOnInteract);
                                    document.removeEventListener('touchstart', playOnInteract);
                                };
                                document.addEventListener('click', playOnInteract);
                                document.addEventListener('touchstart', playOnInteract);
                            }
                        });
                    }
                    window.updatePlayerUI();
                }
                else if (currentIndex === -1 && playingGroupId === null) {
                    const savedGroupId = localStorage.getItem('lastPlayingGroupId');
                    const savedIndex = parseInt(localStorage.getItem('lastTrackIndex'));
                    
                    let savedGroup = null;
                    if (savedGroupId === 'local_queue') {
                        savedGroup = window.getPlayingGroup();
                    } else {
                        savedGroup = groups.find(g => g.id === savedGroupId);
                    }
                    
                    if (savedGroup && !isNaN(savedIndex) && savedIndex >= 0 && savedIndex < savedGroup.tracks.length) {
                        playingGroupId = savedGroupId;
                        currentIndex = savedIndex;
                        if(audio) audio.src = savedGroup.tracks[currentIndex].audioUrl;
                        pendingRestoreTime = true;
                        window.updatePlayerUI();
                    }
                } else {
                    window.updatePlayerUI();
                }
            }
            window.setCloudState('success', 'متصل وتمت المزامنة');
        }, (error) => {
            console.error("Main listener error:", error);
            window.setCloudState('error', 'القراءة مرفوضة');
        });
    } catch (error) {
        console.error(error);
    }

    try {
        const statsRef = doc(db, 'artifacts', appId, 'public', 'data', 'shared_playlist', 'stats');
        if (unsubStats) unsubStats();
        unsubStats = onSnapshot(statsRef, (docSnap) => {
            const countDisplay = document.getElementById('visitor-count-display');
            if (docSnap.exists()) {
                globalVisits = docSnap.data().visits || 0;
                totalTracksPlayed = docSnap.data().plays || 0; 
                globalTrackPlays = docSnap.data().trackPlays || {}; 
                if(countDisplay) countDisplay.innerText = globalVisits;
            } else {
                if(countDisplay) countDisplay.innerText = 0;
                totalTracksPlayed = 0;
                globalTrackPlays = {};
            }
            window.updateTickerUI(); 
        }, (error) => {
            console.error("Stats listener error:", error);
        });

        const visitKey = 'visited_' + appId;
        if (!localStorage.getItem(visitKey)) {
            localStorage.setItem(visitKey, 'true'); 
            updateDoc(statsRef, { visits: increment(1) }).catch(async (e) => {
                if(e.code === 'not-found') {
                    await setDoc(statsRef, { visits: 1, plays: 0, trackPlays: {} });
                }
            });
        }
    } catch(e) {
        console.error(e);
    }
}

window.saveToDB = async function() {
    if (!user) return;
    try {
        window.setCloudState('connecting', 'جاري الاتصال...');
        const dataRef = doc(db, 'artifacts', appId, 'public', 'data', 'shared_playlist', 'main');
        await setDoc(dataRef, { 
            groups: groups, 
            defaultCover: defaultCover, 
            aboutUsText: aboutUsText,
            adminPasswordHash: adminPasswordHash, 
            autoSkipSeconds: autoSkipSeconds,
            introTrack: introTrack,
            playlistBgColor: playlistBgColor
        }, { merge: true });
        window.setCloudState('success', 'تم الحفظ بنجاح');
    } catch (e) {
        console.error(e);
        window.setCloudState('error', 'الكتابة مرفوضة');
    }
};

window.handleDragStart = (e, index) => {
    if (searchQuery) return; 
    const group = window.getViewingGroup();
    if (!group || (!group.isLocal && !isAdmin)) return;
    
    draggedIndex = index;
    e.dataTransfer.effectAllowed = 'move';
    setTimeout(() => {
        e.target.classList.add('opacity-50', 'bg-[#333]');
    }, 10);
};

window.handleDragEnd = (e) => {
    if (searchQuery) return;
    e.target.classList.remove('opacity-50', 'bg-[#333]');
    draggedIndex = -1;
};

window.handleDragOver = (e) => {
    if (searchQuery) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const currentTarget = e.target.closest('.track-item');
    if (currentTarget) {
        currentTarget.classList.add('drag-over');
    }
};

window.handleDragLeave = (e) => {
    if (searchQuery) return;
    const currentTarget = e.target.closest('.track-item');
    if (currentTarget) {
        currentTarget.classList.remove('drag-over');
    }
};

window.handleDrop = (e, targetIndex) => {
    if (searchQuery) return;
    e.preventDefault();
    const currentTarget = e.target.closest('.track-item');
    if (currentTarget) currentTarget.classList.remove('drag-over');

    if (draggedIndex === -1 || draggedIndex === targetIndex) return;

    const group = window.getViewingGroup();
    if (!group || (!group.isLocal && !isAdmin)) return;

    const tracks = group.tracks;
    const movedTrack = tracks[draggedIndex];

    tracks.splice(draggedIndex, 1);
    tracks.splice(targetIndex, 0, movedTrack);

    if (playingGroupId === group.id && currentIndex !== -1) {
        if (currentIndex === draggedIndex) {
            currentIndex = targetIndex;
        } else if (currentIndex > draggedIndex && currentIndex <= targetIndex) {
            currentIndex--;
        } else if (currentIndex < draggedIndex && currentIndex >= targetIndex) {
            currentIndex++;
        }
        localStorage.setItem('lastTrackIndex', currentIndex);
    }

    if(group.isLocal) {
        localStorage.setItem('my_local_queue', JSON.stringify(group.tracks));
    } else {
        window.saveToDB();
    }
    
    window.renderPlaylist();
    if (playingGroupId === group.id) window.updatePlayerUI();
    window.updateTickerUI();
};

window.moveTrackPrompt = (e, index) => {
    e.stopPropagation();
    const currentGroup = window.getViewingGroup();
    if(!currentGroup || !currentGroup.tracks[index] || currentGroup.isLocal) return;

    const otherGroups = groups.filter(g => g.id !== currentGroup.id);
    if(otherGroups.length === 0) {
        alert('لا توجد أقسام أخرى. قم بإنشاء قسم جديد أولاً لكي تتمكن من النقل.');
        return;
    }

    let selectOptions = otherGroups.map(g => `<option value="${g.id}">${g.name}</option>`).join('');
    
    if(!modalContent) return;
    modalContent.innerHTML = `
        <div class="flex items-center justify-between mb-4 border-b border-[#333] pb-3">
            <h3 class="text-lg font-bold text-white flex items-center gap-2">
                <i data-lucide="arrow-right-left" class="w-5 h-5 text-blue-400"></i>
                نقل المقطع
            </h3>
        </div>
        <p class="text-gray-400 mb-4 text-sm">اختر القسم الذي تريد نقل المقطع "<span class="text-white font-medium">${currentGroup.tracks[index].title}</span>" إليه:</p>
        <select id="move-target-group" class="w-full bg-[#0a0a0a] border border-[#333] rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none mb-6">
            ${selectOptions}
        </select>
        <div class="flex justify-end gap-3 mt-auto">
            <button onclick="closeModal()" class="px-5 py-2.5 rounded-lg text-gray-400 hover:bg-[#222] hover:text-white transition-colors">إلغاء</button>
            <button id="modal-confirm-move-btn" class="px-5 py-2.5 rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-medium transition-all shadow-lg shadow-blue-500/20">نقل الآن</button>
        </div>
    `;
    if(modalOverlay) modalOverlay.classList.remove('hidden');
    lucide.createIcons({ root: modalContent });

    const moveConfirmBtn = document.getElementById('modal-confirm-move-btn');
    if(moveConfirmBtn) {
        moveConfirmBtn.addEventListener('click', () => {
            const selectEl = document.getElementById('move-target-group');
            if(selectEl) {
                window.executeMoveTrack(currentGroup.id, selectEl.value, index);
            }
            window.closeModal();
        });
    }
};

window.executeMoveTrack = (sourceGroupId, targetGroupId, trackIndex) => {
    const sourceGroup = groups.find(g => g.id === sourceGroupId);
    const targetGroup = groups.find(g => g.id === targetGroupId);

    if (!sourceGroup || !targetGroup || !sourceGroup.tracks[trackIndex]) return;

    const trackToMove = sourceGroup.tracks.splice(trackIndex, 1)[0];
    targetGroup.tracks.push(trackToMove);

    if (playingGroupId === sourceGroupId) {
        if (currentIndex === trackIndex) {
            playingGroupId = targetGroupId;
            currentIndex = targetGroup.tracks.length - 1; 
            localStorage.setItem('lastPlayingGroupId', playingGroupId);
            localStorage.setItem('lastTrackIndex', currentIndex);
        } else if (currentIndex > trackIndex) {
            currentIndex--;
            localStorage.setItem('lastTrackIndex', currentIndex);
        }
    }
    
    window.saveToDB();
    window.renderPlaylist();
    window.updateTickerUI();
    if (playingGroupId === sourceGroupId || playingGroupId === targetGroupId) {
        window.updatePlayerUI();
    }
};

window.switchGroup = (groupId) => {
    viewingGroupId = groupId;
    isDropdownOpen = false; 
    window.renderGroups();
    window.renderPlaylist();
};

window.addGroup = () => {
    window.openPromptModal('اسم المجموعة الجديدة:', 'مثال: بودكاست، مسلسلات...', (name) => {
        const id = 'group_' + Date.now();
        groups.push({ id, name, tracks: [] });
        viewingGroupId = id;
        isDropdownOpen = false;
        window.saveToDB();
        window.renderGroups();
        window.renderPlaylist();
    }, ''); 
};

window.editGroup = (e, groupId) => {
    e.stopPropagation();
    const group = groups.find(g => g.id === groupId);
    if(!group) return;
    window.openPromptModal('تعديل اسم المجموعة:', 'أدخل الاسم الجديد', (newName) => {
        group.name = newName;
        window.saveToDB();
        window.renderGroups();
        if(playingGroupId === groupId) window.updatePlayerUI();
    }, group.name); 
};

window.editGroupColor = (e, groupId) => {
    e.stopPropagation();
    const group = groups.find(g => g.id === groupId);
    if(!group) return;
    window.openColorModal('تلوين القسم:', (newColor) => {
        group.color = newColor;
        window.saveToDB();
        window.renderGroups();
    }, group.color || '#06b6d4'); 
};

window.editTrack = (e, index) => {
    e.stopPropagation();
    const group = window.getViewingGroup();
    if(!group || !group.tracks[index] || group.isLocal) return;
    window.openPromptModal('تعديل عنوان المقطع:', 'أدخل العنوان الجديد', (newTitle) => {
        group.tracks[index].title = newTitle;
        window.saveToDB();
        window.renderPlaylist();
        if(playingGroupId === group.id && currentIndex === index) window.updatePlayerUI();
    }, group.tracks[index].title);
};

window.editTrackDetails = (e, index) => {
    e.stopPropagation();
    const group = window.getViewingGroup();
    if(!group || !group.tracks[index] || group.isLocal) return;
    window.openDetailsModal('تفاصيل ومعلومات المقطع', group.tracks[index].title, (newDetails) => {
        group.tracks[index].details = newDetails;
        window.saveToDB();
        window.renderPlaylist();
        if(playingGroupId === group.id && currentIndex === index) window.updatePlayerUI();
    }, group.tracks[index].details || '');
};

window.deleteGroup = (e, groupId) => {
    e.stopPropagation();
    window.openConfirmModal('سيتم حذف هذه المجموعة بجميع المقاطع الموجودة بداخلها نهائياً. هل أنت متأكد؟', () => {
        groups = groups.filter(g => g.id !== groupId);
        
        if (viewingGroupId === groupId) {
            viewingGroupId = groups.length > 0 ? groups[0].id : null;
        }
        
        if (playingGroupId === groupId) {
            if(audio) {
                audio.pause();
                audio.removeAttribute('src');
            }
            currentIndex = -1;
            playingGroupId = null;
            isPlaying = false;
            localStorage.removeItem('lastPlayingGroupId');
            localStorage.removeItem('lastTrackIndex');
            window.updatePlayerUI();
        }
        
        window.saveToDB();
        window.renderGroups();
        window.renderPlaylist();
        window.updateTickerUI();
    });
};

window.removeTrack = (e, index) => {
    e.stopPropagation();
    
    const viewingGroup = window.getViewingGroup();
    if (!viewingGroup || viewingGroup.isLocal) return;

    const trackToDelete = viewingGroup.tracks[index];
    if (trackToDelete) {
        localStorage.removeItem('trackProgress_' + trackToDelete.id);
    }
    
    viewingGroup.tracks.splice(index, 1);
    
    if (playingGroupId === viewingGroup.id) {
        if (currentIndex === index) {
            if (viewingGroup.tracks.length > 0) {
                const nextIndex = index >= viewingGroup.tracks.length ? 0 : index;
                window.playTrack(nextIndex);
            } else {
                if(audio) {
                    audio.pause();
                    audio.removeAttribute('src');
                }
                currentIndex = -1;
                playingGroupId = null;
                isPlaying = false;
                localStorage.removeItem('lastPlayingGroupId');
                localStorage.removeItem('lastTrackIndex');
                window.updatePlayerUI();
            }
        } else if (index < currentIndex) {
            currentIndex--;
            localStorage.setItem('lastTrackIndex', currentIndex);
            window.updatePlayerUI();
        }
    }
    
    window.saveToDB();
    window.renderPlaylist();
    window.updateTickerUI();
};

window.renderGroups = function() {
    if (!groups || groups.length === 0 || !groupsContainer) return;
    
    const viewingGroup = window.getViewingGroup();
    
    const toggleColorStyle = viewingGroup.color ? `color: ${viewingGroup.color}; text-shadow: 0 0 5px ${viewingGroup.color}80;` : 'color: #38bdf8; text-shadow: 0 0 5px rgba(56, 189, 248, 0.5);';
    const toggleBorderStyle = viewingGroup.color ? `border-color: ${viewingGroup.color}66;` : 'border-color: #333;';
    
    const toggleHtml = `
        <button onclick="toggleDropdown(event)" class="w-full flex items-center justify-between bg-black/40 border ${toggleBorderStyle} text-white px-4 py-3 rounded-xl hover:bg-black/60 transition-all focus:outline-none shadow-lg backdrop-blur-sm">
            <span class="flex items-center gap-2" style="${toggleColorStyle}">
                <i data-lucide="${viewingGroup.isLocal ? 'list-music' : 'folder-open'}" class="w-5 h-5"></i>
                <span class="font-bold text-base truncate">${viewingGroup.name}</span>
            </span>
            <i data-lucide="chevron-down" class="w-5 h-5 text-gray-400 transition-transform duration-300 ${isDropdownOpen ? 'rotate-180' : ''}"></i>
        </button>
    `;

    const menuItemsHtml = groups.map((g, index) => {
        const isEven = index % 2 === 0;
        const baseBgColor = isEven ? 'rgba(0, 0, 0, 0.2)' : 'rgba(0, 0, 0, 0.4)';

        const activeStyle = g.color ? `background-color: ${g.color}22; border-right: 3px solid ${g.color}; color: #ffffff; text-shadow: 0 0 5px ${g.color}80;` : 'background-color: rgba(6, 182, 212, 0.1); border-right: 3px solid #06b6d4; color: white; text-shadow: 0 0 5px rgba(6,182,212,0.5);';
        const inactiveStyle = g.color ? `background-color: ${baseBgColor}; color: ${g.color}; border-right: 3px solid transparent;` : `background-color: ${baseBgColor}; color: #9ca3af; border-right: 3px solid transparent;`;
        const appliedStyle = (g.id === viewingGroupId) ? activeStyle : inactiveStyle;

        return `
        <div class="flex items-center justify-between px-4 py-3 hover:bg-white/5 cursor-pointer border-b border-white/5 last:border-0 transition-colors backdrop-blur-md" style="${appliedStyle}" onclick="switchGroup('${g.id}')">
            <span class="font-medium text-sm sm:text-base truncate flex-1 pl-2">${g.name}</span>
            <div class="flex items-center gap-1">
                ${isAdmin ? `<button onclick="editGroupColor(event, '${g.id}')" class="p-1.5 text-yellow-500 hover:text-yellow-400 hover:bg-yellow-500/10 rounded-lg transition-colors" title="تلوين القسم"><i data-lucide="palette" class="w-4 h-4"></i></button>` : ''}
                ${isAdmin ? `<button onclick="editGroup(event, '${g.id}')" class="p-1.5 text-cyan-500 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-colors" title="تعديل الاسم"><i data-lucide="edit-2" class="w-4 h-4"></i></button>` : ''}
                ${(isAdmin && g.id !== 'main') ? `<button onclick="deleteGroup(event, '${g.id}')" class="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors" title="حذف المجموعة"><i data-lucide="x" class="w-4 h-4"></i></button>` : ''}
            </div>
        </div>
        `;
    }).join('');

    const dropdownMenuHtml = `
        <div class="${isDropdownOpen ? 'block' : 'hidden'} absolute top-full left-0 right-0 mt-2 bg-[#1a1a1a] border border-[#333] rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] z-[60] max-h-64 overflow-y-auto custom-scrollbar origin-top animate-[opacity_0.2s_ease-out]">
            ${menuItemsHtml}
        </div>
    `;

    groupsContainer.innerHTML = `
        <div class="relative flex-1 w-full" id="custom-dropdown-container">
            ${toggleHtml}
            ${dropdownMenuHtml}
        </div>
        ${isAdmin ? `
            <button onclick="addGroup()" class="flex-shrink-0 flex items-center justify-center w-[52px] h-[52px] rounded-xl bg-black/40 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/10 transition-colors shadow-lg backdrop-blur-sm" title="إضافة مجموعة جديدة">
                <i data-lucide="plus" class="w-6 h-6"></i>
            </button>
        ` : ''}
    `;
    lucide.createIcons({ root: groupsContainer });
};

window.updatePlayerUI = function() {
    const currentPlayingGroup = window.getPlayingGroup();
    const playingTracks = currentPlayingGroup ? currentPlayingGroup.tracks : [];
    
    if(btnPlayPause) btnPlayPause.disabled = (playingTracks.length === 0 && currentIndex === -1 && currentIndex !== -2 && currentIndex !== -3 && currentIndex !== -4);
    if(btnNext) btnNext.disabled = currentIndex === -2 || currentIndex === -3 || currentIndex === -4 || currentIndex >= playingTracks.length - 1 || playingTracks.length === 0;
    if(btnPrev) btnPrev.disabled = currentIndex === -2 || currentIndex === -3 || currentIndex === -4 || currentIndex <= 0 || playingTracks.length === 0;

    let mediaTitle = 'راديو خالد';
    let mediaArtist = 'رحلة الى الزمن الجميل';
    let mediaArtwork = defaultCover || '[https://i.ibb.co/sp6xBm7K/Picsart-26-03-30-18-16-08-102.png](https://i.ibb.co/sp6xBm7K/Picsart-26-03-30-18-16-08-102.png)';

    if (currentIndex === -2) {
        mediaTitle = 'إذاعة القرآن الكريم من القاهرة';
        mediaArtist = 'بث مباشر 🔴';
        if(trackTitle) trackTitle.innerText = mediaTitle;
        if(trackAuthor) trackAuthor.innerText = mediaArtist;
        
        if(playingGroupBadge) {
            playingGroupBadge.innerText = 'بث حي';
            playingGroupBadge.classList.remove('hidden');
        }

        if(trackCover) {
            trackCover.src = mediaArtwork;
            trackCover.classList.remove('hidden');
        }
        if(defaultIcon) defaultIcon.classList.add('hidden');
        
        if (downloadContainer) downloadContainer.classList.add('hidden');
        if (btnRestart) btnRestart.classList.add('hidden');
        if (trackDetailsContainer) trackDetailsContainer.classList.add('hidden');

    } else if (currentIndex === -4) {
        mediaTitle = 'دراما ميكس';
        mediaArtist = 'بث مباشر 🔴';
        if(trackTitle) trackTitle.innerText = mediaTitle;
        if(trackAuthor) trackAuthor.innerText = mediaArtist;
        
        if(playingGroupBadge) {
            playingGroupBadge.innerText = 'بث حي';
            playingGroupBadge.classList.remove('hidden');
        }

        if(trackCover) {
            trackCover.src = mediaArtwork; 
            trackCover.classList.remove('hidden');
        }
        if(defaultIcon) defaultIcon.classList.add('hidden');
        
        if (downloadContainer) downloadContainer.classList.add('hidden');
        if (btnRestart) btnRestart.classList.add('hidden');
        if (trackDetailsContainer) trackDetailsContainer.classList.add('hidden');

    } else if (currentIndex === -3 && introTrack) {
        mediaTitle = introTrack.title || 'هوية الإذاعة';
        mediaArtist = introTrack.author || 'راديو خالد';
        if(trackTitle) trackTitle.innerText = mediaTitle;
        if(trackAuthor) trackAuthor.innerText = mediaArtist;
        
        if(playingGroupBadge) {
            playingGroupBadge.innerText = 'تتر البداية';
            playingGroupBadge.classList.remove('hidden');
        }
        
        const finalCover = introTrack.customCover || defaultCover || introTrack.cover;
        if (finalCover) {
            if(trackCover) {
                trackCover.src = finalCover;
                trackCover.classList.remove('hidden');
            }
            if(defaultIcon) defaultIcon.classList.add('hidden');
        }

        if (downloadContainer) downloadContainer.classList.add('hidden');
        if (btnRestart) btnRestart.classList.remove('hidden');
        if (trackDetailsContainer) trackDetailsContainer.classList.add('hidden');

    } else if (currentPlayingGroup && currentIndex >= 0 && currentIndex < playingTracks.length) {
        const track = playingTracks[currentIndex];
        mediaTitle = track.title;
        mediaArtist = track.author;
        
        if(trackTitle) trackTitle.innerText = mediaTitle;
        if(trackAuthor) trackAuthor.innerText = mediaArtist;
        
        if(playingGroupBadge) {
            playingGroupBadge.innerText = currentPlayingGroup.name;
            playingGroupBadge.classList.remove('hidden');
        }

        const finalCover = track.customCover || defaultCover || track.cover;
        if (finalCover) mediaArtwork = finalCover;

        if (finalCover) {
            if(trackCover) {
                trackCover.src = finalCover;
                trackCover.classList.remove('hidden');
            }
            if(defaultIcon) defaultIcon.classList.add('hidden');
        } else {
            if(trackCover) trackCover.classList.add('hidden');
            if(defaultIcon) defaultIcon.classList.remove('hidden');
        }
        
        if (downloadContainer) downloadContainer.classList.remove('hidden');
        if (btnRestart) btnRestart.classList.remove('hidden');

        if (track.details && track.details.trim() !== '') {
            if(trackDetailsText) trackDetailsText.innerHTML = track.details.replace(/\n/g, '<br>');
            if(trackDetailsContainer) trackDetailsContainer.classList.remove('hidden');
        } else {
            if(trackDetailsContainer) trackDetailsContainer.classList.add('hidden');
        }

    } else {
        if(trackTitle) trackTitle.innerText = 'محطة الراديو جاهزة';
        if(trackAuthor) trackAuthor.innerText = 'اختر مقطعاً لتشغيله';
        if(trackCover) trackCover.classList.add('hidden');
        if(playingGroupBadge) playingGroupBadge.classList.add('hidden');
        if(defaultIcon) defaultIcon.classList.remove('hidden');
        
        if (defaultCover) {
            if(trackCover) {
                trackCover.src = defaultCover;
                trackCover.classList.remove('hidden');
            }
            if(defaultIcon) defaultIcon.classList.add('hidden');
        }

        if (downloadContainer) downloadContainer.classList.add('hidden');
        if (btnRestart) btnRestart.classList.add('hidden');
        if (trackDetailsContainer) trackDetailsContainer.classList.add('hidden');
    }

    if (isPlaying) {
        if(coverContainer) {
            coverContainer.classList.add('border-pink-500', 'shadow-[0_0_30px_rgba(236,72,153,0.3)]', 'animate-spin-slow');
            if (currentIndex === -2) {
                coverContainer.classList.replace('border-pink-500', 'border-emerald-500');
                coverContainer.classList.replace('shadow-[0_0_30px_rgba(236,72,153,0.3)]', 'shadow-[0_0_30px_rgba(16,185,129,0.3)]');
            } else if (currentIndex === -4) {
                coverContainer.classList.replace('border-pink-500', 'border-purple-500');
                coverContainer.classList.replace('shadow-[0_0_30px_rgba(236,72,153,0.3)]', 'shadow-[0_0_30px_rgba(168,85,247,0.3)]');
            } else if (currentIndex === -3) {
                 coverContainer.classList.replace('border-pink-500', 'border-orange-500');
                 coverContainer.classList.replace('shadow-[0_0_30px_rgba(236,72,153,0.3)]', 'shadow-[0_0_30px_rgba(249,115,22,0.3)]');
            }
            coverContainer.classList.remove('border-gray-800');
        }
        if(defaultIcon) defaultIcon.classList.replace('text-gray-600', 'text-cyan-400');
        if(playingGlow) playingGlow.classList.remove('hidden');
        if(visualizerCanvas) visualizerCanvas.classList.replace('opacity-0', 'opacity-100');
        if(btnPlayPause) btnPlayPause.innerHTML = SVG_PAUSE;
    } else {
        if(coverContainer) {
            coverContainer.classList.remove('border-pink-500', 'border-emerald-500', 'border-purple-500', 'border-orange-500', 'shadow-[0_0_30px_rgba(236,72,153,0.3)]', 'shadow-[0_0_30px_rgba(16,185,129,0.3)]', 'shadow-[0_0_30px_rgba(168,85,247,0.3)]', 'shadow-[0_0_30px_rgba(249,115,22,0.3)]', 'animate-spin-slow');
            coverContainer.classList.add('border-gray-800');
        }
        if(defaultIcon) defaultIcon.classList.replace('text-cyan-400', 'text-gray-600');
        if(playingGlow) playingGlow.classList.add('hidden');
        
        if(visualizerCanvas) {
            if (currentIndex !== -1) {
                visualizerCanvas.classList.replace('opacity-0', 'opacity-50');
                visualizerCanvas.classList.replace('opacity-100', 'opacity-50');
            } else {
                visualizerCanvas.classList.replace('opacity-100', 'opacity-0');
                visualizerCanvas.classList.replace('opacity-50', 'opacity-0');
            }
        }
        
        if(btnPlayPause) btnPlayPause.innerHTML = SVG_PLAY;
    }
    
    if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
            title: mediaTitle,
            artist: mediaArtist,
            album: 'راديو خالد',
            artwork: [
                { src: mediaArtwork, sizes: '512x512', type: 'image/png' },
                { src: mediaArtwork, sizes: '256x256', type: 'image/png' },
                { src: mediaArtwork, sizes: '128x128', type: 'image/png' }
            ]
        });
    }
    
    window.renderPlaylist();
    if(trackDetailsContainer) lucide.createIcons({ root: trackDetailsContainer });
};

window.playTrack = (index) => {
    const targetGroup = window.getViewingGroup();
    if (!targetGroup || !targetGroup.tracks[index]) return;
    
    playingGroupId = targetGroup.id;
    currentIndex = index;
    
    localStorage.setItem('lastPlayingGroupId', playingGroupId);
    localStorage.setItem('lastTrackIndex', currentIndex);
    
    window.safeChangeTrack(targetGroup.tracks[currentIndex].audioUrl);
    pendingRestoreTime = true;
    
    window.initAudioBooster();
    window.safePlayAudio();
    
    clearTimeout(audioLoadTimeout);
    audioLoadTimeout = setTimeout(() => {
        if (audio && audio.paused && currentIndex !== -2 && currentIndex !== -3 && currentIndex !== -4) {
            window.showToast('المقطع يستغرق وقتاً طويلاً. قد تكون هناك مشكلة بالرابط أو بالإنترنت. يرجى تحديث الصفحة.', 'error');
            if(trackTitle) trackTitle.innerText = '⚠️ تأخر أو خطأ في التحميل';
        }
    }, 15000);

    window.updatePlayerUI();
};

window.renderPlaylist = function() {
    const viewingGroup = window.getViewingGroup();
    if (!viewingGroup || !playlistContainer) return;

    let tracks = viewingGroup.tracks;
    
    const isSearching = searchQuery.trim() !== '';
    let filteredTracksInfo = tracks.map((track, index) => ({ track, index }));
    
    if (isSearching) {
        const q = searchQuery.toLowerCase();
        filteredTracksInfo = filteredTracksInfo.filter(item => 
            item.track.title.toLowerCase().includes(q) || 
            item.track.author.toLowerCase().includes(q)
        );
        if(playlistCount) playlistCount.innerText = `${filteredTracksInfo.length} من ${tracks.length}`;
    } else {
        if(playlistCount) playlistCount.innerText = `${tracks.length} مقاطع`;
    }

    let extraHeaderHtml = '';
    if (viewingGroup.isLocal && !isSearching) {
        extraHeaderHtml = `
            <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 px-3 py-4 bg-pink-500/10 rounded-xl border border-pink-500/20 gap-3 shadow-sm backdrop-blur-sm">
                <div class="flex flex-col">
                    <span class="text-sm text-pink-300 font-bold flex items-center gap-2"><i data-lucide="info" class="w-4 h-4"></i> قائمتي الخاصة</span>
                    <span class="text-xs text-gray-300 mt-1">يتم حفظ هذه المقاطع في متصفحك الحالي فقط وتعمل بالترتيب التلقائي.</span>
                </div>
                <button onclick="clearQueue()" class="text-xs px-4 py-2.5 bg-red-500/20 text-red-300 rounded-lg hover:bg-red-500 hover:text-white transition-colors flex items-center justify-center gap-2 font-medium w-full sm:w-auto shadow-sm backdrop-blur-md">
                    <i data-lucide="trash-2" class="w-4 h-4"></i> مسح القائمة كاملة
                </button>
            </div>
        `;
    }

    if (filteredTracksInfo.length === 0) {
        playlistContainer.innerHTML = extraHeaderHtml + `
            <div class="h-full flex flex-col items-center justify-center text-white/50 space-y-3 p-4 text-center mt-10">
                <i data-lucide="${isSearching ? 'search-x' : 'music'}" class="w-10 h-10 opacity-50"></i>
                <p>${isSearching ? 'لم يتم العثور على مقاطع مطابقة للبحث' : (viewingGroup.isLocal ? 'القائمة الخاصة بك فارغة حالياً. تصفح الأقسام واضغط على علامة ⨁ لإضافة مقاطع هنا.' : (isAdmin ? 'أضف روابط لتكوين مجموعة "' + viewingGroup.name + '"' : 'لا توجد مقاطع في هذه المجموعة حالياً'))}</p>
            </div>
        `;
        lucide.createIcons({ root: playlistContainer });
        return;
    }

    const listHtml = filteredTracksInfo.map(({ track, index }, arrayIndex) => {
        const isActive = (playingGroupId === viewingGroup.id) && (currentIndex === index);
        
        const isEven = arrayIndex % 2 === 0;
        const baseBgColor = isEven ? 'bg-[#1e1e1e]/95' : 'bg-[#151515]/95'; 

        const activeClasses = isActive 
            ? 'bg-gradient-to-r from-pink-900/40 to-cyan-900/40 border border-pink-500/60 shadow-[0_0_20px_rgba(236,72,153,0.15)] ring-1 ring-pink-500/30' 
            : `hover:bg-[#2a2a2a] border border-[#333] shadow-md ${baseBgColor} hover:border-[#555]`;
            
        const textClasses = isActive ? 'text-pink-300 font-extrabold' : 'text-gray-100 font-bold';
        
        let iconHtml = `<span class="text-gray-500 text-sm group-hover:hidden">${index + 1}</span><i data-lucide="play" class="w-4 h-4 text-cyan-400 hidden group-hover:block ml-0.5"></i>`;
        
        if (isActive) {
            if (isPlaying) {
                iconHtml = `
                    <div class="flex items-center justify-center gap-0.5 h-4">
                        <span class="w-1 h-full bg-pink-400 animate-[pulse_1s_ease-in-out_infinite]"></span>
                        <span class="w-1 h-2/3 bg-cyan-400 animate-[pulse_1s_ease-in-out_infinite_0.2s]"></span>
                        <span class="w-1 h-full bg-pink-400 animate-[pulse_1s_ease-in-out_infinite_0.4s]"></span>
                    </div>
                `;
            } else {
                iconHtml = `<i data-lucide="pause" class="w-4 h-4 text-pink-400"></i>`;
            }
        }

        const canDrag = !isSearching && (viewingGroup.isLocal || isAdmin);
        const dragAttrs = canDrag ? `draggable="true" ondragstart="handleDragStart(event, ${index})" ondragend="handleDragEnd(event)" ondragover="handleDragOver(event)" ondragleave="handleDragLeave(event)" ondrop="handleDrop(event, ${index})"` : '';
        const dragHandle = canDrag ? `<div class="cursor-grab text-gray-500 hover:text-white mr-1 ml-2 flex-shrink-0" title="اسحب للترتيب"><i data-lucide="grip-vertical" class="w-5 h-5"></i></div>` : '';

        const adminControls = (isAdmin && !viewingGroup.isLocal) ? `
            <button onclick="moveTrackPrompt(event, ${index})" class="p-2 text-blue-300 hover:text-blue-100 hover:bg-blue-500/20 rounded-lg transition-colors flex items-center gap-1.5" title="نقل المقطع لقسم آخر">
                <i data-lucide="arrow-right-left" class="w-4 h-4"></i><span class="text-xs font-medium">نقل</span>
            </button>
            <button onclick="setTrackCoverUrl(event, ${index})" class="p-2 text-green-300 hover:text-green-100 hover:bg-green-500/20 rounded-lg transition-colors flex items-center gap-1.5" title="تغيير صورة المقطع">
                <i data-lucide="image" class="w-4 h-4"></i><span class="text-xs font-medium">صورة</span>
            </button>
            <button onclick="editTrackDetails(event, ${index})" class="p-2 text-purple-300 hover:text-purple-100 hover:bg-purple-500/20 rounded-lg transition-colors flex items-center gap-1.5" title="إضافة/تعديل التفاصيل">
                <i data-lucide="file-text" class="w-4 h-4"></i><span class="text-xs font-medium">وصف</span>
            </button>
            <button onclick="editTrack(event, ${index})" class="p-2 text-cyan-300 hover:text-cyan-100 hover:bg-cyan-500/20 rounded-lg transition-colors flex items-center gap-1.5" title="تعديل العنوان">
                <i data-lucide="edit-2" class="w-4 h-4"></i><span class="text-xs font-medium">تعديل</span>
            </button>
            <button onclick="removeTrack(event, ${index})" class="p-2 text-white/70 hover:text-pink-300 hover:bg-pink-500/20 rounded-lg transition-colors flex items-center gap-1.5" title="حذف المقطع من الراديو">
                <i data-lucide="trash-2" class="w-4 h-4"></i><span class="text-xs font-medium">حذف</span>
            </button>
        ` : '';

        const queueButton = viewingGroup.isLocal ? `
            <button onclick="removeFromQueue(event, ${index})" class="px-3 py-1.5 text-white bg-red-500/80 hover:bg-red-500 rounded-lg transition-all flex items-center gap-1.5 shadow-md border border-red-400/50" title="إزالة من قائمتي">
                <i data-lucide="minus-circle" class="w-4 h-4"></i><span class="text-xs font-bold">حذف من قائمتي</span>
            </button>
        ` : `
            <button onclick="addToQueue(event, '${track.id}')" class="px-3 py-1.5 text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 rounded-lg transition-all flex items-center gap-1.5 shadow-md border border-indigo-400/50 transform hover:scale-105" title="إضافة لقائمتي الخاصة">
                <i data-lucide="plus-circle" class="w-4 h-4"></i><span class="text-xs font-bold">إضافة لقائمتي</span>
            </button>
        `;

        return `
            <div ${dragAttrs} onclick="playTrack(${index})" class="track-item group flex flex-col p-3 rounded-xl cursor-pointer transition-all ${activeClasses} mb-3">
                <div class="flex items-start sm:items-center gap-3 w-full min-w-0">
                    ${dragHandle}
                    <div class="flex-shrink-0 w-8 text-center font-bold text-white/70 flex items-center justify-center mt-1 sm:mt-0">
                        ${iconHtml}
                    </div>
                    <div class="flex-1 min-w-0 flex flex-col">
                        <p class="text-sm sm:text-base font-bold leading-relaxed break-words whitespace-normal ${textClasses} text-shadow-sm">${track.title}</p>
                        <p class="text-xs text-cyan-300/80 truncate mt-1">@${track.author}</p>
                    </div>
                </div>
                <div class="flex flex-wrap items-center justify-start gap-2 mt-3 pt-3 border-t border-white/10 w-full" onclick="event.stopPropagation()">
                    ${queueButton}
                    ${adminControls ? `<div class="h-4 w-px bg-white/20 mx-1"></div>` : ''}
                    ${adminControls}
                </div>
            </div>
        `;
    }).join('');

    playlistContainer.innerHTML = extraHeaderHtml + listHtml;
    lucide.createIcons({ root: playlistContainer });
};

if (linkInput) {
    linkInput.addEventListener('input', (e) => {
        if(btnSubmit) btnSubmit.disabled = e.target.value.trim() === '' || isLoading;
    });
}

if (linkForm) {
    linkForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if(!linkInput) return;
        const url = linkInput.value.trim();
        if(errorMsg) errorMsg.classList.add('hidden');
        
        const viewingGroup = window.getViewingGroup();
        if(!viewingGroup || viewingGroup.isLocal) {
            alert('لا يمكنك إضافة مقاطع من الرابط مباشرة إلى القائمة الخاصة بك. أضفها في قسم عادي أولاً ثم أضفها لقائمتك الخاصة بضغط زر الإضافة.');
            return;
        }
        
        const alreadyExists = viewingGroup.tracks.some(t => t.url === url);
        if (alreadyExists) {
            if(errorMsg) {
                errorMsg.innerText = 'هذا الرابط تمت إضافته من قبل في هذه المجموعة!';
                errorMsg.classList.remove('hidden');
            }
            return;
        }

        isLoading = true;
        if(btnSubmit) {
            btnSubmit.disabled = true;
            btnSubmit.innerHTML = `
                <i data-lucide="loader-2" class="w-5 h-5 animate-spin"></i>
                <span class="hidden sm:inline">جاري السحب</span>
            `;
            lucide.createIcons({ root: btnSubmit.parentElement });
        }
        if(linkInput) linkInput.disabled = true;

        try {
            const tracks = await window.fetchLinkInfo(url);
            if (tracks && tracks.length > 0) {
                if (tracks.length === 1) {
                    window.openPromptModal('تأكيد/تعديل اسم المقطع:', 'أدخل الاسم', (finalTitle) => {
                        tracks[0].title = finalTitle || tracks[0].title;
                        window.finishAdding(viewingGroup, tracks);
                    }, tracks[0].title);
                } else {
                    window.openMultiTrackModal(tracks, (updatedTracks) => {
                        window.finishAdding(viewingGroup, updatedTracks);
                    });
                }
            }
        } catch (err) {
            if(errorMsg) {
                errorMsg.innerText = err.message || 'حدث خطأ أثناء الاتصال بالخادم.';
                errorMsg.classList.remove('hidden');
            }
        } finally {
            isLoading = false;
            if(linkInput) linkInput.disabled = false;
            if(btnSubmit) {
                btnSubmit.disabled = false;
                btnSubmit.innerHTML = `
                    <i data-lucide="plus" class="w-5 h-5"></i>
                    <span class="hidden sm:inline">إضافة</span>
                `;
                lucide.createIcons({ root: btnSubmit.parentElement });
            }
        }
    });
}

window.finishAdding = function(viewingGroup, newTracksArray) {
    if(!newTracksArray || newTracksArray.length === 0) return;
    
    const numAdded = newTracksArray.length;
    viewingGroup.tracks.unshift(...newTracksArray);
    
    if (playingGroupId === viewingGroup.id && currentIndex !== -1) {
        currentIndex += numAdded;
        localStorage.setItem('lastTrackIndex', currentIndex);
    }

    window.saveToDB();
    window.updateTickerUI(); 
    if(linkInput) linkInput.value = '';
    
    if (playingGroupId === null && currentIndex === -1 && viewingGroup.tracks.length === numAdded) {
        window.playTrack(0);
    } else {
        window.updatePlayerUI();
    }
};

btnPlayPause?.addEventListener('click', () => {
    if (currentIndex === -2 || currentIndex === -3 || currentIndex === -4) {
        if (isPlaying) {
            if(audio) audio.pause();
        } else {
            window.initAudioBooster();
            window.safePlayAudio();
        }
        return;
    }

    const currentGroup = window.getPlayingGroup();
    
    if (!currentGroup || currentIndex === -1 || currentGroup.tracks.length === 0) {
        const viewingGroup = window.getViewingGroup();
        if (viewingGroup && viewingGroup.tracks.length > 0) {
            window.playTrack(0);
        } else {
            alert("عذراً، لا توجد مقاطع للتشغيل في هذه المجموعة!");
        }
        return;
    }
    
    if (isPlaying) {
        if(audio) audio.pause();
    } else {
        window.initAudioBooster();
        window.safePlayAudio();
    }
});

btnRestart?.addEventListener('click', () => {
    if(audio) audio.currentTime = 0;
    if (currentIndex === -3) {
        if (!isPlaying) {
            window.initAudioBooster();
            window.safePlayAudio();
        }
        return;
    }
    const currentGroup = window.getPlayingGroup();
    if (currentGroup && currentGroup.tracks[currentIndex]) {
        localStorage.setItem('trackProgress_' + currentGroup.tracks[currentIndex].id, 0);
    }
    if (!isPlaying && currentGroup && currentGroup.tracks.length > 0) {
        window.initAudioBooster();
        window.safePlayAudio();
    }
});

btnNext?.addEventListener('click', () => {
    if (currentIndex === -3) {
        if(audio) { audio.pause(); audio.removeAttribute('src'); }
        currentIndex = -1;
        playingGroupId = null;
        isPlaying = false;
        window.updatePlayerUI();
        return;
    }
    const currentGroup = window.getPlayingGroup();
    if (currentGroup && currentIndex < currentGroup.tracks.length - 1) {
        viewingGroupId = currentGroup.id;
        window.playTrack(currentIndex + 1);
    }
});

btnPrev?.addEventListener('click', () => {
    if (currentIndex === -3) {
        if(audio) audio.currentTime = 0;
        return;
    }
    const currentGroup = window.getPlayingGroup();
    if (currentGroup && currentIndex > 0) {
        viewingGroupId = currentGroup.id;
        window.playTrack(currentIndex - 1);
    }
});

btnLoop?.addEventListener('click', () => {
    isLooping = !isLooping;
    if(audio) audio.loop = isLooping;
    if (isLooping) {
        btnLoop.classList.replace('text-gray-500', 'text-pink-400');
        btnLoop.classList.replace('hover:bg-[#2a2a2a]', 'bg-pink-500/20');
        if(loopIcon) loopIcon.setAttribute('data-lucide', 'repeat-1');
    } else {
        btnLoop.classList.replace('text-pink-400', 'text-gray-500');
        btnLoop.classList.replace('bg-pink-500/20', 'hover:bg-[#2a2a2a]');
        if(loopIcon) loopIcon.setAttribute('data-lucide', 'repeat');
    }
    lucide.createIcons();
});

if (audio) {
    audio.addEventListener('play', () => {
        isPlaying = true;
        
        if (currentIndex !== -2 && currentIndex !== -3 && currentIndex !== -4) {
            const currentGroup = window.getPlayingGroup();
            if (currentGroup && currentGroup.tracks[currentIndex] && !currentGroup.isLocal) {
                const trackId = currentGroup.tracks[currentIndex].id;
                if (user && lastPlayedTrackId !== trackId) {
                    lastPlayedTrackId = trackId;
                    const statsRef = doc(db, 'artifacts', appId, 'public', 'data', 'shared_playlist', 'stats');
                    
                    const updateData = {
                        plays: increment(1),
                        [`trackPlays.${trackId}`]: increment(1)
                    };
                    
                    updateDoc(statsRef, updateData).catch(async (e) => {
                        if(e.code === 'not-found') {
                            await setDoc(statsRef, { 
                                plays: 1, 
                                visits: globalVisits,
                                trackPlays: { [trackId]: 1 }
                            });
                        }
                    });
                }
            }
        }
        
        window.updatePlayerUI();
    });

    audio.addEventListener('pause', () => {
        isPlaying = false;
        window.updatePlayerUI();
    });

    audio.addEventListener('ended', () => {
        if (currentIndex === -2 || currentIndex === -4) return; 
        
        if (currentIndex === -3) {
            if(audio) { audio.pause(); audio.removeAttribute('src'); }
            currentIndex = -1;
            playingGroupId = null;
            isPlaying = false;
            window.updatePlayerUI();
            return;
        }
        
        const currentGroup = window.getPlayingGroup();
        if (currentGroup && currentGroup.tracks[currentIndex]) {
            localStorage.setItem('trackProgress_' + currentGroup.tracks[currentIndex].id, 0);
        }
        if (!isLooping && currentGroup) {
            if (currentIndex < currentGroup.tracks.length - 1) {
                viewingGroupId = currentGroup.id;
                window.playTrack(currentIndex + 1);
            } else {
                isPlaying = false;
            }
        }
    });

    audio.addEventListener('loadedmetadata', () => {
        if (currentIndex === -2 || currentIndex === -4) {
            if(durationTxt) durationTxt.innerText = '🔴';
            return;
        }
        
        if(durationTxt) durationTxt.innerText = window.formatTime(audio.duration);
        
        if (currentIndex === -3) return; 
        
        const currentGroup = window.getPlayingGroup();
        if (pendingRestoreTime && currentGroup && currentGroup.tracks[currentIndex]) {
            let savedTime = parseFloat(localStorage.getItem('trackProgress_' + currentGroup.tracks[currentIndex].id)) || 0;
            if (savedTime > 0 && savedTime < audio.duration - 2) {
                audio.currentTime = savedTime;
            } else if (autoSkipSeconds > 0 && audio.duration > (autoSkipSeconds + 5)) {
                audio.currentTime = autoSkipSeconds;
            }
            pendingRestoreTime = false;
        }
    });

    audio.addEventListener('timeupdate', () => {
        const current = audio.currentTime;
        const duration = audio.duration || 0;
        
        if (currentIndex === -2 || currentIndex === -4) {
            if (!isDraggingProgress) {
                if(currentTimeTxt) currentTimeTxt.innerText = 'بث مباشر';
                if(progressBar) progressBar.style.width = '100%';
            }
            return;
        }
        
        if (!isDraggingProgress) {
            if(currentTimeTxt) currentTimeTxt.innerText = window.formatTime(current);
            if(progressBar) progressBar.style.width = duration ? `${(current / duration) * 100}%` : '0%';
        }
        
        if (currentIndex === -3) return; 

        const currentGroup = window.getPlayingGroup();
        if (currentGroup && currentGroup.tracks[currentIndex] && duration > 0) {
            localStorage.setItem('trackProgress_' + currentGroup.tracks[currentIndex].id, current);
        }
    });
}

window.updateProgressFromEvent = function(e) {
    if (!audio || !audio.duration || !progressContainer || currentIndex === -2 || currentIndex === -4) return;
    const rect = progressContainer.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));
    
    audio.currentTime = percentage * audio.duration;
    if(progressBar) progressBar.style.width = `${percentage * 100}%`;
    if(currentTimeTxt) currentTimeTxt.innerText = window.formatTime(audio.currentTime);
};

if (progressContainer) {
    progressContainer.addEventListener('mousedown', (e) => {
        if(currentIndex === -2 || currentIndex === -4) return;
        isDraggingProgress = true;
        window.updateProgressFromEvent(e);
    });

    progressContainer.addEventListener('touchstart', (e) => {
        if(currentIndex === -2 || currentIndex === -4) return;
        isDraggingProgress = true;
        window.updateProgressFromEvent(e.touches[0]);
    }, { passive: false });
}

window.addEventListener('mousemove', (e) => {
    if (isDraggingProgress) window.updateProgressFromEvent(e);
});

window.addEventListener('mouseup', () => {
    isDraggingProgress = false;
});

window.addEventListener('touchmove', (e) => {
    if (isDraggingProgress) window.updateProgressFromEvent(e.touches[0]);
});

window.addEventListener('touchend', () => {
    isDraggingProgress = false;
});

window.updateVolumeUI = function() {
    if (gainNode) gainNode.gain.value = volume;
    if(audio) audio.volume = Math.min(volume, 1);
    
    if(volumeText) {
        volumeText.innerText = `${Math.round(volume * 100)}%`;
        if (volume > 1) {
            volumeText.setAttribute('class', 'text-xs font-mono font-bold w-12 text-center py-1 rounded-md text-pink-400 bg-pink-500/10');
        } else {
            volumeText.setAttribute('class', 'text-xs font-mono font-bold w-12 text-center py-1 rounded-md text-cyan-400 bg-cyan-500/10');
        }
    }

    if(btnMute) {
        let volIcon = 'volume-2';
        if (volume === 0) volIcon = 'volume-x';
        else if (volume <= 1) volIcon = 'volume-1';
        
        const iconColor = volume > 1 ? 'text-pink-400' : 'text-gray-400 group-hover:text-cyan-400';
        btnMute.innerHTML = `<i data-lucide="${volIcon}" class="w-5 h-5 ${iconColor} transition-colors group"></i>`;
        lucide.createIcons({ root: btnMute });
    }
};

if (volumeSlider) {
    volumeSlider.addEventListener('input', (e) => {
        volume = parseFloat(e.target.value);
        window.updateVolumeUI();
    });
}

if (btnMute) {
    btnMute.addEventListener('click', () => {
        volume = volume === 0 ? 1 : 0;
        if(volumeSlider) volumeSlider.value = volume;
        window.updateVolumeUI();
    });
}

if (downloadBtnEl) {
    downloadBtnEl.addEventListener('click', async (e) => {
        e.preventDefault();
        
        let track;
        if (currentIndex === -3 && introTrack) {
            track = introTrack;
        } else {
            const currentGroup = window.getPlayingGroup();
            if (!currentGroup) return;
            track = currentGroup.tracks[currentIndex];
        }
        
        if (!track) return;
        
        try {
            const response = await fetch(track.audioUrl);
            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = `Audio_Track_${track.id}.mp3`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(blobUrl);
        } catch (error) {
            const link = document.createElement('a');
            link.href = track.audioUrl;
            link.target = '_blank';
            link.download = `Audio_Track_${track.id}.mp3`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    });
}

window.applyAdminMode();
