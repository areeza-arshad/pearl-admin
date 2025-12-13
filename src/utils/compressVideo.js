// src/utils/simpleCompress.js
export const compressVideo = (file) => new Promise((resolve) => {
  const video = document.createElement('video');
  const stream = video.captureStream(30); // 30fps
  const recorder = new MediaRecorder(stream, {
    mimeType: 'video/webm;codecs=vp9',
    videoBitsPerSecond: 1500000 // 1.5Mbps
  });
  
  video.src = URL.createObjectURL(file);
  video.muted = true;
  
  const chunks = [];
  recorder.ondataavailable = e => chunks.push(e.data);
  
  video.onloadedmetadata = async () => {
    video.currentTime = 0;
    await video.play();
    recorder.start();
    
    video.onseeked = () => recorder.requestData(); // Chunk every second
    
    setTimeout(() => {
      recorder.stop();
      video.pause();
    }, Math.min(30000, video.duration * 1000 * 1.1));
  };
  
  recorder.onstop = () => {
    const blob = new Blob(chunks, { type: 'video/webm' });
    resolve(new File([blob], file.name.replace('.mp4', '-compressed.webm'), { type: 'video/webm' }));
  };
});
