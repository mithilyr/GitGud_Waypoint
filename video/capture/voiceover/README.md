# Voiceover extraction

The voiceover was generated (ElevenLabs) from `out/narration.md` as one file, so it also reads the timecodes and scene headings aloud, and the timing does not match the video.
These scripts cut the real script lines out of that file, with no speech-to-text service:

1. `asr.py` offline word timestamps with PocketSphinx (its bundled English model; rough text, good timing).
2. `align.py` aligns the script words to the recognised words (tolerates misrecognitions) and finds each line's start and end.
3. `cut.py` exports each line to `public/voice/Lnn.mp3`, snapping to pauses so words are not clipped.
4. `verify.py` re-transcribes every cut so leftover timecodes or headings are visible.

A few boundaries were fixed by hand (lines 4, 13, 28, 30, 37), and "or read the code" was spliced out of the last line, because the repo link is no longer on screen. Voice level: +7.5 dB with a limiter, then −2 dB (about −18 LUFS). The scripts expect `vo.mp3`, `vo16.wav` and `words.json` in the working directory; paths inside are from the original run.
