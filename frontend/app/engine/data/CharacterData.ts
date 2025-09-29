export interface ICharacterData {
    builtInModelId: string,
    basePath: string,
    fileName: string,
    name: string,
    thumbnail: string,
    scale: number,
    animationsFiles: string[],
    useMixamoAnimations?: boolean
}

// characters/_mixamo_animations/
const mixamoAnimations: string[] = [
    'Walking.fbx',
    'Running.fbx',
    'Sitting Idle.fbx',
    'Sitting.fbx',
    'Male Sitting Pose.fbx',
    'Jump.fbx'
];

export const mixamoAnimationPaths: string[] = mixamoAnimations.map(animation => `./characters/_mixamo_animations/${animation}`);

// BaseMeshesCharacterKit assets are expected to be located under
// `public/characters/BaseMeshesCharacterKit/` with the original folder
// structure intact (FBX directory containing the core rig plus pose clips,
// and the rig manual JPG used as a thumbnail).
export const characterDatas: Map<string, ICharacterData> = new Map([
    ["lily", {
        builtInModelId: 'lily',
        name: 'Lily',
        basePath: './characters/lily/',
        fileName: 'lily_Breathing Idle_w_skin.fbx',
        thumbnail: './characters/thumbs/lily.webp',
        scale: 1,
        animationsFiles: [
            'Idle.fbx',
            'Walking.fbx',
            'Fast Run.fbx',
            'Jump.fbx',
            'Sitting Idle.fbx',
            'Female Laying Pose.fbx',
            'Male Laying Pose.fbx',
        ]
    }]
]);

export const getModelPathById = (builtInModelId: string, ): string => {
    const characterData = characterDatas.get(builtInModelId);
    if (!characterData) {
        throw new Error(`Character data not found for builtInModelId: ${builtInModelId}`);
    }
    return characterData.basePath + characterData.fileName;
}

export const getAnimationPathsById = (builtInModelId: string): string[] => {
    const characterData = characterDatas.get(builtInModelId);
    if (!characterData) {
        throw new Error(`Character data not found for builtInModelId: ${builtInModelId}`);
    }
    
    if (characterData.useMixamoAnimations) {
        return mixamoAnimationPaths;
    } else if (characterData.animationsFiles) {
        return characterData.animationsFiles.map(fileName => characterData.basePath + fileName)
    }
}
