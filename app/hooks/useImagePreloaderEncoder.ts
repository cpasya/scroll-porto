"use client";

//ini untuk folder "sequence-3" 
//nama frame nya: frame__000001.webp

import { useEffect, useState, useRef } from "react";

export function useImagePreloaderEncoder(
    basePath: string, 
    frameCount: number,
    onProgress?: (progress: number) => void,
    onFrameLoaded?: (index: number) => void
) {
    const [isLoaded, setIsLoaded] = useState(false);
    const imagesRef = useRef<HTMLImageElement[]>([]);

    useEffect(() => {
        // Reset state jika basePath atau frameCount berubah
        setIsLoaded(false);
        let loadedCount = 0;
        const tempImages: HTMLImageElement[] = [];

        // Looping dimulai dari 1 agar sesuai dengan frame_000001
        for (let i = 1; i <= frameCount; i++) {
            const img = new Image();

            // UPDATE 1: Ubah padding menjadi 6 digit angka (misal: "000001")
            const paddedIndex = String(i).padStart(6, "0");

            // UPDATE 2: Sesuaikan format string nama file (menggunakan satu underscore untuk sequence-1)
            img.src = `${basePath}/frame_${paddedIndex}.webp`;

            const handleLoad = () => {
                loadedCount++;
                
                if (onProgress) {
                    onProgress((loadedCount / frameCount) * 100);
                }

                // Tambahkan langsung ke referensi agar bisa langsung diakses sebelum semua selesai
                imagesRef.current[i - 1] = img;

                if (onFrameLoaded) {
                    onFrameLoaded(i - 1);
                }

                if (loadedCount === frameCount) {
                    setIsLoaded(true);
                }
            };

            img.onload = handleLoad;

            img.onerror = () => {
                console.error(`Failed to load image: ${img.src}`);
                handleLoad();
            };

            tempImages.push(img);
        }

        return () => {
            // Cleanup: Mencegah memory leak atau state update di komponen yang udah unmount
            loadedCount = 0;
        };
    }, [basePath, frameCount]);

    return { isLoaded, images: imagesRef.current };
}