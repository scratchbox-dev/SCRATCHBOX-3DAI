import * as THREE from 'three';
import { EntityBase, EntityType, SerializedEntityData } from '@/engine/entity/base/EntityBase';
import { GenerativeEntity, GenerativeEntityProps, SerializedGenerativeEntityData } from '@/engine/entity/types/GenerativeEntity';
import { SerializedShapeEntityData, ShapeEntity, ShapeEntityProps } from '@/engine/entity/types/ShapeEntity';
import { LightEntity, LightProps, SerializedLightEntityData } from '@/engine/entity/types/LightEntity';
import { CharacterEntity, CharacterEntityProps, SerializedCharacterEntityData } from '@/engine/entity/types/CharacterEntity'
import { v4 as uuidv4 } from 'uuid';
import { CreateEntityAsyncCommand } from '@/lib/commands';
import { EditorEngine } from '../core/EditorEngine';
import { DeleteEntityCommand } from '@/lib/commands';
import { Basic3DEntity, Basic3DEntityProps, SerializedBasic3DEntityData } from '@/engine/entity/types/Basic3DEntity';

// Base properties common to all entities
interface BaseEntityOptions {
  name?: string;
  id?: string;
  position?: THREE.Vector3;
  rotation?: THREE.Euler;
  scaling?: THREE.Vector3;
  onLoaded?: (entity: EntityBase) => void;
}

// Type-specific options using discriminated union
export type CreateEntityOptions =
  | (BaseEntityOptions & { type: 'generative', generativeProps: GenerativeEntityProps })
  | (BaseEntityOptions & { type: 'shape', shapeProps: ShapeEntityProps })
  | (BaseEntityOptions & { type: 'light', lightProps: LightProps, rotation?: THREE.Euler })
  | (BaseEntityOptions & { type: 'character', characterProps: CharacterEntityProps })
  | (BaseEntityOptions & { type: 'basic3D', basic3DProps: Basic3DEntityProps });

/**
 * Factory class for creating entities
 */
export class EntityFactory {
  /**
   * Create an entity based on type
   */
  static createEntityDefault(type: EntityType, onLoaded?: (entity: EntityBase) => void): EntityBase {
    const name = `${type}`;
    const newUuid = uuidv4();
    const scene = EditorEngine.getInstance().getScene();

    switch (type) {
      case 'generative':
        return new GenerativeEntity(name, scene, {
          uuid: newUuid,
          entityType: 'generative',
          created: new Date().toISOString(),
          name: name,
          props: {
            generationLogs: [],
            currentGenerationId: undefined,
            currentGenerationIdx: undefined,
          }
        }, onLoaded);
      case 'shape':
        return new ShapeEntity(name, scene, {
          uuid: newUuid,
          entityType: 'shape',
          created: new Date().toISOString(),
          name: name,

          props: { shapeType: 'cube' },
        },
          onLoaded
        );
      case 'light':
        return new LightEntity(name, scene, {
          uuid: newUuid,
          entityType: 'light',
          created: new Date().toISOString(),
          name: name,
          props: { color: { r: 1, g: 1, b: 1 }, intensity: 1, shadowEnabled: false },
        }, onLoaded);
      case 'character':
        return new CharacterEntity(
          scene,
          name,
          {
            uuid: newUuid,
            entityType: 'character',
            created: new Date().toISOString(),
            name: name,
            characterProps: {
              builtInModelId: 'base_female_a', // Use a valid character ID
            },
          },
          onLoaded
        );
      default:
        throw new Error(`Unknown entity type`);
    }
  }

  static createEntity(options: CreateEntityOptions): EntityBase {
    const scene = EditorEngine.getInstance().getScene();
    const newUuid = options.id || uuidv4();
    const name = options.name || options.type;
    switch (options.type) {
      case 'generative':
        return new GenerativeEntity(
          options.name || options.type,
          scene,
          {
            uuid: newUuid,
            entityType: 'generative',
            name: name,
            props: options.generativeProps,
          },
          options.onLoaded
        );
      case 'shape':
        console.log(`Creating shape entity`, options.shapeProps);
        return new ShapeEntity(
          options.name || options.shapeProps.shapeType,
          scene,
          {
            uuid: newUuid,
            entityType: 'shape',
            name: options.name || options.shapeProps.shapeType,
            props: options.shapeProps,
          },
          options.onLoaded
        );
      case 'light':
        return new LightEntity(options.name || options.type, scene, {
          uuid: newUuid,
          entityType: 'light',
          name: options.name || "light",
          props: options.lightProps,
        },
          options.onLoaded
        );
      case 'character':
        return new CharacterEntity(
          scene,
          options.name || options.characterProps.name || options.type,
          {
            uuid: newUuid,
            entityType: 'character',
            name: options.name || options.characterProps.name || options.type,
            characterProps: options.characterProps,
            scaling: options.scaling,
          },
          options.onLoaded
        );
      case 'basic3D':
        return new Basic3DEntity(
          options.name || "3D Model",
          scene,
          {
            uuid: newUuid,
            entityType: 'basic3D',
            name: options.name || "3D Model",
            props: options.basic3DProps,
          },
          options.onLoaded
        );
      default:
        // This ensures exhaustive type checking
        const exhaustiveCheck: never = options;
        throw new Error(`Unknown entity type: ${exhaustiveCheck}`);
    }
  }

  static async duplicateEntity(entity: EntityBase, engine: EditorEngine): Promise<EntityBase | null> {
    const scene = engine.getScene();
    const historyManager = engine.getHistoryManager();

    const duplicateCommand = new CreateEntityAsyncCommand(
      async () => {
        // TODO: Quick and dirty duplicate: serialize and deserialize
        const serializedEntityData = entity.serialize();
        const newEntity = await this.deserializeEntity(scene, serializedEntityData);

        if (newEntity) {
          newEntity.position.x += 0.2;
          engine.selectEntity(newEntity);
        } else {
          throw new Error(`Failed to deserialize entity`);
        }
        return newEntity;
      },
      scene
    );
    historyManager.executeCommand(duplicateCommand);
    const newEntity = duplicateCommand.getEntity();
    return newEntity;
  }

  static deleteEntity(entity: EntityBase, engine: EditorEngine): void {
    console.log("EntityFactory.deleteEntity called for:", entity.getName());
    const deleteCommand = new DeleteEntityCommand(entity);
    console.log("Executing delete command");
    engine.getHistoryManager().executeCommand(deleteCommand);
  }

  static async deserializeEntity(scene: THREE.Scene, entityData: SerializedEntityData): Promise<EntityBase | null> {
    const entityType = entityData.entityType;
    let entity: EntityBase | null = null;
    
    try {
      return new Promise<EntityBase>((resolve, reject) => {
        const onLoaded = (entity: EntityBase) => {
          resolve(entity);
        };
        
        // Generate a better name if the current name is generic
        const generateBetterName = (originalName: string, type: EntityType): string => {
          // Check if the name is generic (starts with 'entity-' followed by numbers)
          if (originalName.match(/^entity-\d+$/)) {
            // Generate a meaningful name based on type
            const timestamp = Date.now().toString().slice(-6); // Last 6 digits of timestamp
            switch (type) {
              case 'shape':
                return `Shape ${timestamp}`;
              case 'light':
                return `Light ${timestamp}`;
              case 'character':
                return `Character ${timestamp}`;
              case 'generative':
                return `Frame ${timestamp}`;
              case 'basic3D':
                return `3D Model ${timestamp}`;
              default:
                return `${type} ${timestamp}`;
            }
          }
          return originalName;
        };
        
        const betterName = generateBetterName(entityData.name, entityType);
        
        switch (entityType) {
          case 'light':
            entity = new LightEntity(betterName, scene, entityData as SerializedLightEntityData, onLoaded);
            break;

          case 'shape':
            entity = new ShapeEntity(betterName, scene, entityData as SerializedShapeEntityData, onLoaded);
            break;

          case 'generative':
            entity = new GenerativeEntity(betterName, scene, entityData as SerializedGenerativeEntityData, onLoaded);
            break;

          case 'character':
            entity = new CharacterEntity(scene, betterName, entityData as SerializedCharacterEntityData, onLoaded);
            break;

          case 'basic3D':
            entity = new Basic3DEntity(betterName, scene, entityData as SerializedBasic3DEntityData, onLoaded);
            break;

          default:
            reject(new Error(`Unknown entity type: ${entityType}`));
            break;
        }
      });
    } catch (error) {
      throw new Error(`Error deserializing entity: ${error}`);
    }
  }
} 