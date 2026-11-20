/**
 * Global Constants and Configuration Data
 * 
 * This file contains static data used throughout the Lyria Studio application,
 * including configuration options for the Prompt Builder (moods, genres, themes),
 * a list of example songs for the gallery, and a collection of SVG icons as React components.
 */
import React from 'react';
import { ExampleSong } from './types';

/**
 * Configuration for the Prompt Builder helper tool.
 * Provides predefined lists of musical attributes to help users construct prompts.
 */
export const PROMPT_HELPER_CONFIG = {
  moods: ['Unhinged', 'Ruthless', 'Petty & Toxic', 'Zero-Mercy', 'Savage', 'Diabolical', 'Feral', 'Cold-Blooded', 'Passive-Aggressive', 'Drunk & Loud', 'Bitter & Petty', 'Menacing', 'Chaotic', 'Deadpan Sarcastic', 'Delusional', 'Unapologetic'],
  genders: ['Heavy 808 Diss Rap', 'Underground Boom Bap', 'Dark Bass House', 'Aggressive Phonk', 'Silky Toxic 90s R&B', 'Heartbreak Outlaw Country', '2000s Pop-Punk Meltdown', 'Petty Gospel Choir', 'Dark Villain Trap', 'Dramatic Opera Diss', 'Spoken-Word Slam Roast', 'Mariachi Breakup Ballad', 'Industrial Metal', 'Sleazy Disco Funk', 'Sarcastic Piano Ballad'],
  themes: ['Your Fucked-Up Birthday', 'Getting Divorced & Still Broke', 'Fantasy Football Last Place', 'The Money You Still Owe Me', 'Gold Diggin Bitch', 'Getting Fired On Your Day Off', 'Fake Clout-Chasing Friends', 'Texting Your Toxic Ex at 4:32AM', 'Your 24% APR Car Payment', 'Peaking in High School', 'Your Delusional Situationship', 'Being the Biggest Flake Alive', 'Getting Ghosted Again', 'Ruining the Group Chat', 'Your Retarded Life Decisions'],
  timestamps: ['0:10', '0:20', '0:30', '0:45', '1:00', '1:15', '1:30', '2:00'],
  bpms: ['80 BPM', '100 BPM', '120 BPM', '128 BPM', '140 BPM', '160 BPM', '172 BPM'],
  scales: ['Evil Villain Key', 'Dark & Menacing Key', 'Fake Happy Party Key', 'Heartbroken Sad Key', 'Horror Movie Tension', 'Grimy Street Blues', 'Dramatic Funeral Key', 'Drug Addict Clown Key']
};

export const EXAMPLE_SONGS: ExampleSong[] = [
  {
    id: '1',
    title: 'Neon Horizons',
    artist: 'Lyria Synth',
    coverUrl: 'https://picsum.photos/seed/music1/400/400',
    prompt: 'A high-energy synthwave track with driving basslines, shimmering 80s pads, and a cinematic build-up. Suggests a late-night drive through a futuristic cityscape.',
    duration: '3:45',
    tags: ['Electronic', 'Synthwave', 'Cinematic']
  },
  {
    id: '2',
    title: 'Midnight Jazz Lounge',
    artist: 'Echo Blue',
    coverUrl: 'https://picsum.photos/seed/music2/400/400',
    prompt: 'Soft acoustic jazz with a smooth saxophone lead, light brush drums, and a warm upright bass. Intimate atmosphere with a touch of melancholy.',
    duration: '2:30',
    tags: ['Jazz', 'Acoustic', 'Chill']
  },
  {
    id: '3',
    title: 'Digital Raindrops',
    artist: 'Pixel Pulse',
    coverUrl: 'https://picsum.photos/seed/music3/400/400',
    prompt: 'Experimental IDM featuring glitchy textures, rhythmic water drop samples, and ethereal vocal chops. Dynamic and evolving soundscape.',
    duration: '4:12',
    tags: ['IDM', 'Experimental', 'Ambient']
  },
  {
    id: '4',
    title: 'Desert Mirage',
    artist: 'Solar Winds',
    coverUrl: 'https://picsum.photos/seed/music4/400/400',
    prompt: 'A slow, atmospheric ambient track with sweeping pads, distant echoing guitar, and subtle wind sound effects. Evokes a feeling of vast, empty spaces.',
    duration: '5:05',
    tags: ['Ambient', 'Atmospheric', 'Chill']
  },
  {
    id: '5',
    title: 'Cybernetic Rebellion',
    artist: 'Null Pointer',
    coverUrl: 'https://picsum.photos/seed/music5/400/400',
    prompt: 'Aggressive industrial techno with distorted kick drums, metallic clangs, and a fast, driving tempo. High energy and intense.',
    duration: '3:15',
    tags: ['Techno', 'Industrial', 'Aggressive']
  },
  {
    id: '6',
    title: 'Summer Breeze',
    artist: 'The Sunflowers',
    coverUrl: 'https://picsum.photos/seed/music6/400/400',
    prompt: 'An uplifting indie pop song with bright acoustic guitars, a catchy whistling melody, and a light, bouncy rhythm. Cheerful and carefree.',
    duration: '2:50',
    tags: ['Indie Pop', 'Uplifting', 'Acoustic']
  }
];

export const Icons = {
  Play: ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M8 5v14l11-7z" />
    </svg>
  ),
  Pause: ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
    </svg>
  ),
  Info: ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  ),
  Sparkles: ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
      <path d="M20 3v4" />
      <path d="M22 5h-4" />
      <path d="M4 17v2" />
      <path d="M5 18H3" />
    </svg>
  ),
  ChevronRight: ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polyline points="9 18 15 12 9 6" />
    </svg>
  ),
  ChevronDown: ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  ),
  Loading: ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  ),
  Download: ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  ),
  Video: ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M23 7l-7 5 7 5V7z" />
      <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
    </svg>
  ),
  RefreshCw: ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  ),
  Camera: ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  ),
  X: ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
};