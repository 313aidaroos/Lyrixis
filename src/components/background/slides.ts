/**
 * Free Unsplash lifestyle photos — diverse people enjoying music,
 * smiling, and outdoor life. Decorative only; hidden from screen readers.
 */
export const BACKGROUND_SLIDES = [
  {
    id: "headphones-smile",
    alt: "Young woman smiling with headphones",
    src: "https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=1600&q=70",
  },
  {
    id: "friends-music",
    alt: "Friends of different backgrounds walking together",
    src: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1600&q=70",
  },
  {
    id: "concert-joy",
    alt: "Crowd enjoying live music",
    src: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=1600&q=70",
  },
  {
    id: "boating-lake",
    alt: "People boating on a calm lake",
    src: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=1600&q=70",
  },
  {
    id: "earbuds-outdoors",
    alt: "Person listening to music outdoors",
    src: "https://images.unsplash.com/photo-1539579154551-0219877da509?auto=format&fit=crop&w=1600&q=70",
  },
  {
    id: "laughing-friends",
    alt: "Diverse friends laughing together",
    src: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=1600&q=70",
  },
  {
    id: "sailing",
    alt: "Sailboat on open water",
    src: "https://images.unsplash.com/photo-1544551763-77ef1d7cfc1f?auto=format&fit=crop&w=1600&q=70",
  },
  {
    id: "street-music",
    alt: "Person enjoying music on the street",
    src: "https://images.unsplash.com/photo-1521334884684-d8022cdbfd14?auto=format&fit=crop&w=1600&q=70",
  },
] as const;

export const SLIDE_COUNT = BACKGROUND_SLIDES.length;
/** Seconds per slide in the crossfade cycle */
export const SLIDE_DURATION_S = 18;
