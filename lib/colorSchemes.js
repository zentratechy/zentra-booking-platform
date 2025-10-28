"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultColorScheme = exports.colorSchemes = void 0;
exports.getColorScheme = getColorScheme;
exports.colorSchemes = [
    {
        id: 'classic',
        name: 'Classic Spa',
        description: 'Elegant cream and sage green',
        colors: {
            primary: '#8B7355',
            primaryDark: '#6B5744',
            secondary: '#A8B5A0',
            accent: '#D4C5B9',
            background: '#FAF8F3',
            text: '#2C2C2C',
        },
    },
    {
        id: 'modern',
        name: 'Modern Minimalist',
        description: 'Clean black and white',
        colors: {
            primary: '#000000',
            primaryDark: '#1a1a1a',
            secondary: '#4A4A4A',
            accent: '#E0E0E0',
            background: '#FFFFFF',
            text: '#000000',
        },
    },
    {
        id: 'luxe',
        name: 'Luxe Gold',
        description: 'Sophisticated gold and navy',
        colors: {
            primary: '#1a2332',
            primaryDark: '#0d1117',
            secondary: '#C9A961',
            accent: '#E8D5B5',
            background: '#F5F1E8',
            text: '#1a2332',
        },
    },
    {
        id: 'fresh',
        name: 'Fresh Mint',
        description: 'Vibrant mint and teal',
        colors: {
            primary: '#2D9596',
            primaryDark: '#1F6F70',
            secondary: '#9AD0C2',
            accent: '#ECF4D6',
            background: '#FEFFFF',
            text: '#2C3333',
        },
    },
    {
        id: 'rose',
        name: 'Rose Garden',
        description: 'Soft pink and rose',
        colors: {
            primary: '#D4567D',
            primaryDark: '#B23A5D',
            secondary: '#EFB8C8',
            accent: '#F8E8EE',
            background: '#FFF5F7',
            text: '#3D3D3D',
        },
    },
    {
        id: 'earth',
        name: 'Earth Tones',
        description: 'Natural brown and beige',
        colors: {
            primary: '#8B6F47',
            primaryDark: '#6B5537',
            secondary: '#C9A66B',
            accent: '#E8D5B7',
            background: '#FAF6F0',
            text: '#3E3E3E',
        },
    },
    {
        id: 'ocean',
        name: 'Ocean Blue',
        description: 'Calming blue and aqua',
        colors: {
            primary: '#2E5EAA',
            primaryDark: '#1E4E8A',
            secondary: '#4A90E2',
            accent: '#D4E6F1',
            background: '#F0F8FF',
            text: '#1A1A2E',
        },
    },
    {
        id: 'lavender',
        name: 'Lavender Dreams',
        description: 'Soothing purple and lilac',
        colors: {
            primary: '#7B68A6',
            primaryDark: '#5B4886',
            secondary: '#B19CD9',
            accent: '#E6DFF0',
            background: '#F9F7FC',
            text: '#3D3D3D',
        },
    },
];
exports.defaultColorScheme = exports.colorSchemes[0]; // Classic Spa
function getColorScheme(id) {
    return exports.colorSchemes.find(scheme => scheme.id === id) || exports.defaultColorScheme;
}
//# sourceMappingURL=colorSchemes.js.map