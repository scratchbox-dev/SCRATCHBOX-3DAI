import React, { useEffect, useState, useRef } from 'react';
import { IconArrowLeft, IconArrowRight, IconCornerDownLeft, IconScissors, IconDownload, IconPaint, IconChevronDown } from '@tabler/icons-react';

import { removeBackground, generateRodin3DFromText, generateRodin3DFromImage } from '@/engine/utils/generation/generation-util';
import { GenerationResult } from '@/engine/utils/generation/realtime-generation-util';
import RatioSelector from '../RatioSelector';
import { Button } from '@/components/ui/button';
import { trackEvent, ANALYTICS_EVENTS } from '@/engine/utils/external/analytics';
import { GenerativeEntity, GenerationStatus, StylePromptOption, styleOptions, StylePromptOptionKey, StylePromptOptions, } from '@/engine/entity/types/GenerativeEntity';
import { IGenerationLog } from '@/engine/interfaces/generation';
import { ImageRatio } from "@/engine/utils/imageUtil";
import { toast } from 'sonner';
import { useEditorEngine } from '@/context/EditorEngineContext';
import { DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@radix-ui/react-dropdown-menu';
import { DropdownMenu } from '@radix-ui/react-dropdown-menu';

// TODO: This is a hack to get the previous entity.
let PREV_ENTITY: GenerativeEntity | null = null;


const GenerativeEntityPanel = (props: { entity: GenerativeEntity }) => {

  const { userPreferences } = useEditorEngine();
  const [promptInput, setPromptInput] = useState(props.entity.temp_prompt);
  const inputElementRef = useRef<HTMLTextAreaElement>(null);
  const [currentRatio, setCurrentRatio] = useState<ImageRatio>('3:4');
  const [styleOption, setStyleOption] = useState<StylePromptOptionKey>("BASIC_3D");
  
  // 3D generation method state
  const [threeDMethod, setThreeDMethod] = useState<'trellis' | 'rodin'>('trellis');

  // State for processing
  const [isGenerating2D, setIsGenerating2D] = useState(false);
  const [isGenerating3D, setIsGenerating3D] = useState(false);
  const [progressMessage, setProgressMessage] = useState('');

  // Add a state variable to force re-renders
  const [updateCounter, setUpdateCounter] = useState(0);

  const applyGenerationLogToUI = (genLog: IGenerationLog) => {
    if (genLog.assetType === 'image') {
      setCurrentRatio(genLog.imageParams?.ratio || "3:4");
      setStyleOption(genLog.imageParams?.stylePrompt || "BASIC_3D");
    }
    if (genLog.assetType === 'model') {
      setIsGenerating3D(false);
    }
    trySetPrompt('applyGenLogToUI', genLog.prompt);
  }

  // Update when selected entity changes
  useEffect(() => {
    const handleProgress = (param: { entity: GenerativeEntity, state: GenerationStatus, message: string }) => {
      if (param.entity.uuid === PREV_ENTITY?.uuid) {
        console.log("handleProgress: ", param.state, param.message);
        setIsGenerating2D(param.state === 'generating2D');
        setIsGenerating3D(param.state === 'generating3D');
        setProgressMessage(param.message);
      }
    }
    const handleGenerationChanged = (param: { entity: GenerativeEntity }) => {
      if (param.entity.uuid === PREV_ENTITY?.uuid) {
        // Force a re-render by incrementing the counter
        setUpdateCounter(prev => prev + 1);
        trySetPrompt('onGenerationChanged', props.entity.temp_prompt);
        setCurrentRatio(props.entity.temp_ratio || "3:4");
        setStyleOption(props.entity.temp_styleOption || "BASIC_3D");
      }
    }

    // If selected entity changed
    if (PREV_ENTITY?.uuid !== props.entity.uuid) {
      console.log("entity changed: ", PREV_ENTITY?.uuid, "to", props.entity.uuid);
      // Remove the event handlers
      if (PREV_ENTITY) {
        PREV_ENTITY.onProgress.remove(handleProgress);
        PREV_ENTITY.onGenerationChanged.remove(handleGenerationChanged);
      }

      // Get the current generation and set the prompt if available
      const currentGen = props.entity.getCurrentGenerationLog();
      if (currentGen) {
        applyGenerationLogToUI(currentGen);
      } else {
        trySetPrompt('onEntityChange', props.entity.temp_prompt);
        setStyleOption(props.entity.temp_styleOption || "BASIC_3D");
        setCurrentRatio(props.entity.temp_ratio || "3:4");
      }

      // Set the new entity
      PREV_ENTITY = props.entity;
    }

    // Initial state update
    handleProgress({ entity: props.entity, state: props.entity.status, message: props.entity.statusMessage });

    // Add event handlers
    props.entity.onProgress.add(handleProgress);
    props.entity.onGenerationChanged.add(handleGenerationChanged);

    return () => {
      console.log("unmounting entity:", props.entity.uuid);
      // Clean up event handlers
      if (PREV_ENTITY) {
        PREV_ENTITY.onProgress.remove(handleProgress);
        PREV_ENTITY.onGenerationChanged.remove(handleGenerationChanged);
      }
    }
  }, [props.entity]);

  useEffect(() => {
    if (PREV_ENTITY) {
      PREV_ENTITY.temp_prompt = promptInput;
      PREV_ENTITY.temp_ratio = currentRatio;
      PREV_ENTITY.temp_styleOption = styleOption;
    }
  }, [promptInput, currentRatio, styleOption]);


  // Additional effect to handle the input field mounting
  useEffect(() => {
    // if (props.entity && inputElementRef.current) {
    //   inputElementRef.current.focus();
    //   setTimeout(() => {
    //     inputElementRef.current?.focus();
    //     console.log("Focused input");
    //   }, 50);
    // }
  }, [props.entity, inputElementRef]);

  // Add keyboard shortcut handler
  useEffect(() => {
    const handleKeyboardShortcuts = (e: KeyboardEvent) => {
      if (!props.entity) return;
      const history = props.entity.props.generationLogs;
      if (history.length > 1 && !isGenerating2D && !isGenerating3D) {
        const currentHistoryIndex = props.entity.getCurrentGenerationLogIdx();
        if (e.shiftKey && e.key === "ArrowLeft") {
          e.preventDefault();
          if (currentHistoryIndex > 0) {
            goToPreviousGeneration();
          }
        }

        if (e.shiftKey && e.key === "ArrowRight") {
          e.preventDefault();
          if (currentHistoryIndex < history.length - 1) {
            goToNextGeneration();
          }
        }
      }
    };
    // Add the event listener
    document.addEventListener("keydown", handleKeyboardShortcuts);
    // Clean up the event listener when component unmounts
    return () => {
      document.removeEventListener("keydown", handleKeyboardShortcuts);
    };
  }, [props.entity.props.generationLogs, props.entity.props.currentGenerationId, isGenerating2D, isGenerating3D, promptInput]);


  useEffect(() => {
    console.log("GenerativeEntityPanel: generation logs changed: ", props.entity.props.generationLogs, props.entity.props.currentGenerationIdx);
    const currentGenLog = props.entity.getCurrentGenerationLog();
    if (currentGenLog) {
      applyGenerationLogToUI(currentGenLog);
    }
  }, [props.entity.props.generationLogs, props.entity.props.currentGenerationIdx, props.entity.props.currentGenerationId, updateCounter]);


  const handleInputFieldKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Shift + Enter
    if (e.shiftKey && e.key === "Enter" && !e.ctrlKey) {
      console.log("handleInputFieldKeyDown: shift + enter");
      handleGenerate3D();
      e.preventDefault();
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey) {
      handleGenerate2D();
    }
  }

  const showFalApiKeyError = () => {
    toast.error('This feature requires a FAL API key. Please enter a valid FAL API key in the settings');
  }

  const notValidApiKey = () => {
    return !userPreferences.falApiKey || userPreferences.falApiKey.length < 60;
  }

  // Handle image generation
  const handleGenerate2D = async () => {

    if (notValidApiKey()) {
      showFalApiKeyError();
      return;
    }

    console.log('handleGenerate2D', promptInput);
    if (!props.entity || !promptInput.trim()) return;
    try {
      let result: GenerationResult;
      result = await props.entity.generateRealtimeImage(promptInput, { ratio: currentRatio, stylePrompt: styleOption });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
      setIsGenerating2D(false);
    }
  };

  // Convert to 3D model
  const handleGenerate3D = async () => {

    if (!userPreferences.falApiKey) {
      showFalApiKeyError();
      return;
    }

    const startTime = Date.now();

    // Track start of 3D conversion
    trackEvent(ANALYTICS_EVENTS.CONVERT_TO_3D + '_started', {
      entity_type: props.entity?.getEntityType() || 'unknown',
      has_image: !!props.entity?.getCurrentGenerationLog()?.fileUrl,
      method: threeDMethod,
    });

    try {
      console.log('handleGenerate3D with method:', threeDMethod);
      if (!props.entity) return;

      let result: GenerationResult;

      if (threeDMethod === 'rodin') {
        // Get current generation for image-to-3D
        const currentGen = props.entity.getCurrentGenerationLog();
        if (!currentGen || currentGen.assetType !== 'image' || !currentGen.fileUrl) {
          toast.error('Please generate an image first');
          return;
        }

        // Use Hyper3D Rodin for image-to-3D conversion
        result = await generateRodin3DFromImage(
          currentGen.fileUrl,
          props.entity,
          props.entity.getScene(),
          currentGen.id,
          {
            prompt: promptInput,
            quality: 'medium',
            material: 'PBR'
          }
        );
      } else {
        // Use original Trellis method
        const currentGen = props.entity.getCurrentGenerationLog();
        if (!currentGen || currentGen.assetType !== 'image' || !currentGen.fileUrl) {
          toast.error('Please generate an image first');
          return;
        }

        result = await props.entity.generate3DModel(currentGen.fileUrl, currentGen.id, {
          prompt: promptInput,
          apiProvider: 'trellis'
        });
      }

      // Track successful 3D conversion
      trackEvent(ANALYTICS_EVENTS.CONVERT_TO_3D + '_completed', {
        execution_time_ms: Date.now() - startTime,
        success: result.success,
        entity_type: props.entity?.getEntityType() || 'unknown',
        method: threeDMethod,
      });
    } catch (error) {
      // Track conversion error
      trackEvent(ANALYTICS_EVENTS.CONVERT_TO_3D + '_error', {
        execution_time_ms: Date.now() - startTime,
        error_message: error instanceof Error ? error.message : String(error),
        entity_type: props.entity?.getEntityType() || 'unknown',
        method: threeDMethod,
      });

      console.error('Error generating 3D:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate 3D model');
    }
  };

  // Generate 3D directly from text (Rodin only)
  const handleGenerateTextTo3D = async () => {
    if (!userPreferences.falApiKey) {
      showFalApiKeyError();
      return;
    }

    if (!promptInput.trim()) {
      toast.error('Please enter a prompt first');
      return;
    }

    const startTime = Date.now();

    // Track start of text-to-3D generation
    trackEvent(ANALYTICS_EVENTS.CONVERT_TO_3D + '_text_started', {
      entity_type: props.entity?.getEntityType() || 'unknown',
      prompt_length: promptInput.length,
    });

    try {
      console.log('handleGenerateTextTo3D');
      if (!props.entity) return;

      // Use Hyper3D Rodin for text-to-3D generation
      const result = await generateRodin3DFromText(
        promptInput,
        props.entity,
        props.entity.getScene(),
        'text-to-3d',
        {
          quality: 'medium',
          material: 'PBR'
        }
      );

      // Track successful text-to-3D generation
      trackEvent(ANALYTICS_EVENTS.CONVERT_TO_3D + '_text_completed', {
        execution_time_ms: Date.now() - startTime,
        success: result.success,
        entity_type: props.entity?.getEntityType() || 'unknown',
      });
    } catch (error) {
      // Track generation error
      trackEvent(ANALYTICS_EVENTS.CONVERT_TO_3D + '_text_error', {
        execution_time_ms: Date.now() - startTime,
        error_message: error instanceof Error ? error.message : String(error),
        entity_type: props.entity?.getEntityType() || 'unknown',
      });

      console.error('Error generating 3D from text:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate 3D model from text');
    }
  };



  // Handle navigation through generation history
  const goToPreviousGeneration = () => {
    console.log("goToPreviousGeneration");
    props.entity.goToPreviousGeneration();
  };

  const goToNextGeneration = () => {
    console.log("goToNextGeneration");
    props.entity.goToNextGeneration();
  };

  const renderSpinner = (message?: string) => {
    return (
      <>
        <svg className=" animate-spin mb-1 h-3 w-3 " xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-50" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-100" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        {message && <span className="text-xs ">{message}</span>}
      </>
    );
  };

  const trySetPrompt = (by: string, prompt: string) => {
    console.log('trySetPrompt', by, prompt);
    setPromptInput(prompt);
  }

  // Handle ratio change
  const handleRatioChange = (ratio: ImageRatio) => {
    if (!props.entity) return;

    // Update the entity's aspect ratio
    setCurrentRatio(ratio);
    props.entity.temp_ratio = ratio;

    // Apply the ratio to the mesh
    props.entity.updateAspectRatio(ratio);
  };

  const handleStyleOptionChange = (styleOption: StylePromptOptionKey) => {
    setStyleOption(styleOption);
    props.entity.temp_styleOption = styleOption;
  }

  // Handler for removing background
  // TODO: bring back later
  const handleRemoveBackground = async () => {
    if (!props.entity || !currentGenLog) return;
    if (currentGenLog.assetType !== 'image' || !currentGenLog.fileUrl) return;

    // Call the background removal function
    const result = await removeBackground(
      currentGenLog.fileUrl,
      props.entity,
      currentGenLog.id // Pass current image ID as the derived from ID
    );

    if (result.success && result.generationLog) {
      props.entity.addImageGenerationLog(promptInput, result.generationLog.fileUrl, currentRatio, styleOption);
    }
  };

  const handleDownload = () => {
    console.log('handleDownload');
    if (!props.entity?.getCurrentGenerationLog()?.fileUrl) return;

    // Call the download function
    const a = document.createElement('a');
    a.href = props.entity.getCurrentGenerationLog()?.fileUrl || '';
    a.download = props.entity.getCurrentGenerationLog()?.fileUrl?.split('/').pop() || 'image.png';
    a.target = '_blank';
    a.click();
  }


  const isGenerating = isGenerating2D || isGenerating3D;

  // Check if we can remove background (only if we have a current image)
  const hasImage =
    !isGenerating &&
    props.entity.getCurrentGenerationLog()?.assetType === 'image' &&
    !!props.entity.getCurrentGenerationLog()?.fileUrl;

  const currentGenLogIndex = props.entity.getCurrentGenerationLogIdx();
  const currentGenLog = props.entity.getCurrentGenerationLog();
  const hasPreviousGeneration = currentGenLogIndex > 0;
  const hasNextGeneration = currentGenLogIndex < props.entity.props.generationLogs.length - 1;

  return <>
    <div className="flex flex-col space-y-2 p-1">

      {/* Prompt */}
      <div className="space-y-2 flex flex-row space-x-2">
        {(props.entity.props.isImported === false || props.entity.props.isImported === undefined) &&
          <div className="flex flex-col m-0">
            {/* Bottom row */}
            <div className="flex justify-start space-x-1 h-6 pr-2">

              {<RatioSelector
                value={currentRatio}
                onChange={handleRatioChange}
                disabled={isGenerating}
              />}

              {/* Style selector dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant={'ghost'} className="p-1 px-1 rounded h-6">
                    <span className="text-xs">{StylePromptOptions[styleOption].label}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="panel-shape py-2 rounded-2xl overflow-hidden" side="bottom" sideOffset={15}>
                  {Object.keys(StylePromptOptions).map((key) => (
                    <DropdownMenuItem
                      key={key}
                      className="cursor-pointer text-sm hover:bg-gray-100 px-2 py-1"
                      onClick={() => handleStyleOptionChange(key as StylePromptOptionKey)}
                    >
                      {StylePromptOptions[key as StylePromptOptionKey].label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>


              {/* History navigation buttons */}
              {props.entity.props.generationLogs.length > 1 && (
                <>
                  <Button
                    variant={'ghost'}
                    className={`p-1 rounded mr-0 w-6 h-6`}
                    onClick={goToPreviousGeneration}
                    disabled={!hasPreviousGeneration || isGenerating}
                    title="Previous generation (Shift + ←)"
                  >
                    <IconArrowLeft size={16} />
                  </Button>
                  <span className="text-xs text-gray-400 self-center">
                    {currentGenLogIndex + 1}/{props.entity.props.generationLogs.length}
                  </span>
                  <Button
                    variant={'ghost'}
                    className={`p-1 rounded mr-0 w-6 h-6`}
                    onClick={goToNextGeneration}
                    disabled={!hasNextGeneration || isGenerating}
                    title="Next generation (Shift + →)"
                  >
                    <IconArrowRight size={16} />
                  </Button>
                </>
              )}
              <div className='flex-grow'></div>
              <Button className="p-1 rounded w-6 h-6 "
                variant={'ghost'}
                onClick={handleDownload}
                disabled={!currentGenLog?.fileUrl}
              >
                {/* Icon */}
                <IconDownload size={16} />
              </Button>
            </div>
            <textarea
              ref={inputElementRef}
              placeholder="Enter prompt..."
              className="w-96 p-0 mt-2 text-xs bg-none border-none m-0 mr-2 focus:outline-none"
              value={promptInput}
              onKeyDown={handleInputFieldKeyDown}
              onChange={(e) => {
                setPromptInput(e.target.value)
              }}
              disabled={isGenerating}
              rows={3}
            />
          </div>
        }

        <div className="flex flex-row gap-1 min-h-16">
          <div className='flex flex-col space-x-1 h-full'>
            {(props.entity.props.isImported === false || props.entity.props.isImported === undefined) &&
              <Button
                variant={"outline"}
                className={`relative text-xs whitespace-normal w-20  flex-grow flex-col gap-0`}
                onClick={handleGenerate2D}
                disabled={isGenerating || !promptInput.trim()}
              >
                {isGenerating2D && renderSpinner('Generating')}
                {!isGenerating2D && <>
                  {hasImage ? 'Regenerate' : 'Generate Image'}
                  {!hasImage && <span className="mx-1 text-xxxs opacity-50 block my-0">
                    <IconCornerDownLeft size={10} className='inline' />
                  </span>}
                </>}
              </Button>}

            {/* Remove Background button. Temporarily disabled */}
            {hasImage && (
              <Button
                className={`relative text-xs flex-grow w-20`}
                onClick={handleRemoveBackground}
                variant={'outline'}
                disabled={isGenerating}
              >
                Remove BG
              </Button>
            )}
          </div>

          <div className="flex flex-col space-y-1">
            {/* 3D Method Selector */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant={'ghost'} className="p-1 px-2 rounded h-6 text-xs">
                  <span>{threeDMethod === 'rodin' ? 'Rodin' : 'Trellis'}</span>
                  <IconChevronDown size={12} className="ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="panel-shape py-2 rounded-2xl overflow-hidden" side="bottom" sideOffset={5}>
                <DropdownMenuItem
                  className="cursor-pointer text-sm hover:bg-gray-100 px-2 py-1"
                  onClick={() => setThreeDMethod('trellis')}
                >
                  Trellis (Fast)
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer text-sm hover:bg-gray-100 px-2 py-1"
                  onClick={() => setThreeDMethod('rodin')}
                >
                  Hyper3D Rodin (Production)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Text-to-3D Button (Rodin only) */}
            {threeDMethod === 'rodin' && (
              <Button
                className={`relative text-xs whitespace-normal w-20 flex-col p-1`}
                onClick={handleGenerateTextTo3D}
                disabled={isGenerating || !promptInput.trim()}
                variant="outline"
              >
                {isGenerating3D && renderSpinner('')}
                {!isGenerating3D && <>Text→3D
                  <span className="mx-1 text-[10px] opacity-50 block">Rodin</span>
                </>}
                {isGenerating3D && <span className="text-[10px]">{progressMessage}</span>}
              </Button>
            )}

            {/* Image-to-3D Button */}
            <Button
              className={`relative text-xs whitespace-normal w-20 flex-col p-1 ${threeDMethod === 'rodin' && 'flex-grow'}`}
              onClick={handleGenerate3D}
              disabled={isGenerating || !currentGenLog || currentGenLog.assetType !== 'image'}
            >
              {isGenerating3D && renderSpinner('')}
              {!isGenerating3D && <>
                {threeDMethod === 'rodin' ? 'Image→3D' : 'Convert 3D'}
                <span className="mx-1 text-[10px] opacity-50 block">
                  {threeDMethod === 'rodin' ? 'Rodin' : 'Shift+'}<IconCornerDownLeft size={10} className='inline' />
                </span>
              </>}
              {isGenerating3D && <span className="text-[10px]">{progressMessage}</span>}
            </Button>
          </div>

        </div>

      </div>
    </div>
  </>;
};

export default GenerativeEntityPanel;


