export type PresetGroup = {
  groupName: string;
  items: string[];
};

export type PresetItem = string | PresetGroup;

export const NODE_PRESETS: Record<string, PresetItem[]> = {
  'Camera': [
    {
      groupName: 'Canon',
      items: [
        'Canon EOS R5', 
        'Canon EF 50mm f/1.8', 
        'Canon RF 85mm f/1.2 L USM', 
        'Canon EF 70-200mm f/2.8L'
      ]
    },
    {
      groupName: 'Nikon',
      items: [
        'Nikon Z9', 
        'NIKKOR Z 35mm f/1.8 S', 
        'NIKKOR Z 24-70mm f/2.8 S', 
        'NIKKOR Z 14-24mm f/2.8 S'
      ]
    },
    {
      groupName: 'Sony',
      items: [
        'Sony A7R V', 
        'Sony FE 24mm f/1.4 GM', 
        'Sony FE 85mm f/1.4 GM', 
        'Sony FE 70-200mm f/2.8 GM OSS'
      ]
    },
    {
      groupName: 'Film Cameras',
      items: [
        'Leica M6',
        'Hasselblad 500C/M',
        'Polaroid SX-70',
        'Kodak Portra 400',
        'Fujifilm Superia 400'
      ]
    },
    {
      groupName: 'Perspectives & Angles',
      items: [
        'Wide Angle', 
        'Macro Lens', 
        'Drone View', 
        'GoPro', 
        'Fisheye',
        'Telephoto',
        'Low Angle',
        'High Angle'
      ]
    }
  ],
  'Lighting': [
    {
      groupName: 'Natural Light',
      items: [
        'Golden Hour', 'Blue Hour', 'Overcast', 'Direct Sunlight', 
        'Dappled Sunlight', 'Moonlight', 'Bioluminescence'
      ]
    },
    {
      groupName: 'Studio Lighting',
      items: [
        'High Key', 'Low Key', 'Rembrandt Lighting', 'Split Lighting', 
        'Butterfly Lighting', 'Ring Light', 'Softbox Lighting', 'Hard Flash'
      ]
    },
    {
      groupName: 'Artificial & Cinematic',
      items: [
        'Cinematic Lighting', 'Volumetric Lighting', 'God Rays', 
        'Neon Lights', 'Cyberpunk City Lights', 'Candlelight', 'Firelight'
      ]
    }
  ],
  'Style': [
    {
      groupName: 'Digital Art',
      items: [
        'Cyberpunk', 'Concept Art', 'Unreal Engine 5', 'Octane Render', 
        '3D Render', 'Vector Art', 'Low Poly', 'Voxel Art', 'Synthwave'
      ]
    },
    {
      groupName: 'Traditional Media',
      items: [
        'Oil Painting', 'Watercolor', 'Acrylic', 'Charcoal Sketch', 
        'Ink Wash', 'Pencil Drawing', 'Pastel'
      ]
    },
    {
      groupName: 'Photography',
      items: [
        'Photorealistic', 'Polaroid', 'Kodachrome', 'Black and White', 'Macro Photography'
      ]
    },
    {
      groupName: 'Anime & Comics',
      items: [
        'Studio Ghibli', '90s Anime', 'Comic Book', 'Manga', 'Webtoon', 'Pop Art'
      ]
    }
  ],
  'Environment': [
    {
      groupName: 'Sci-Fi',
      items: [
        'Sci-Fi City', 'Cybernetic Landscape', 'Space Station', 
        'Alien Planet', 'Post-apocalyptic', 'Neon Streets'
      ]
    },
    {
      groupName: 'Fantasy',
      items: [
        'Fantasy Forest', 'Magic Castle', 'Enchanted Swamp', 
        'Floating Islands', 'Dragon Lair'
      ]
    },
    {
      groupName: 'Urban & Architecture',
      items: [
        'Cozy Interior', 'Abandoned Factory', 'Brutalist Architecture', 
        'Gothic Cathedral', 'Modern Minimalist Home'
      ]
    },
    {
      groupName: 'Nature',
      items: [
        'Lush Rainforest', 'Desert Dunes', 'Snowy Mountains', 
        'Deep Ocean', 'Coral Reef'
      ]
    }
  ],
  'Aspect Ratio': [
    '1:1 (Square)',
    '16:9 (Widescreen)',
    '9:16 (Vertical/Stories)',
    '4:3 (Standard)',
    '3:4 (Portrait)',
    '21:9 (Cinematic)',
    '3:2 (Classic 35mm)'
  ],
  'Artist': [
    {
      groupName: 'Classic Painters',
      items: [
        'Leonardo da Vinci', 'Vincent van Gogh', 'Claude Monet', 
        'Rembrandt', 'Johannes Vermeer', 'Gustav Klimt'
      ]
    },
    {
      groupName: 'Modern & Surrealist',
      items: [
        'Pablo Picasso', 'Salvador Dali', 'Rene Magritte', 
        'Frida Kahlo', 'Jackson Pollock', 'Andy Warhol'
      ]
    },
    {
      groupName: 'Sci-Fi & Fantasy',
      items: [
        'H.R. Giger', 'Syd Mead', 'Frank Frazetta', 
        'Simon Stålenhag', 'Greg Rutkowski', 'Moebius'
      ]
    },
    {
      groupName: 'Anime & Manga',
      items: [
        'Hayao Miyazaki', 'Katsuhiro Otomo', 'Makoto Shinkai', 
        'Junji Ito', 'Kentaro Miura'
      ]
    }
  ],
  'Age': [
    'Baby', 'Toddler', 'Child', 'Teenager', 'Young Adult', 
    'Adult', 'Middle-aged', 'Elderly', 'Ancient'
  ],
  'Gender': [
    'Male', 'Female', 'Androgynous', 'Non-binary'
  ],
  'Race': [
    'Caucasian', 'Black', 'Asian', 'Hispanic', 'Middle Eastern', 
    'Native American', 'Pacific Islander', 'Mixed Race'
  ],
  'Subject': [],
  'Custom': []
};

export const PRESET_CATEGORIES = Object.keys(NODE_PRESETS);
