import React, { useState, useEffect } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  FormControl,
  FormLabel,
  Input,
  NumberInput,
  NumberInputField,
  Select,
  VStack,
  FormErrorMessage,
  Alert, 
  AlertIcon,
  Spinner,
} from '@chakra-ui/react';
import { useAppStore } from '../stores/useAppStore';
import { usePeopleStore, Person } from '../stores/usePeopleStore';
import { useDealsStore, Deal } from '../stores/useDealsStore';
import { usePipelinesStore, Pipeline } from '../stores/usePipelinesStore';
import { useStagesStore } from '../stores/useStagesStore';
import type { DealInput, Stage } from '../generated/graphql/graphql';

interface EditDealModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDealUpdated: () => void;
  deal: Deal | null;
}

function EditDealModal({ isOpen, onClose, onDealUpdated, deal }: EditDealModalProps) {
  const [name, setName] = useState('');
  const [selectedPipelineId, setSelectedPipelineId] = useState<string>('');
  const [selectedStageId, setSelectedStageId] = useState<string>('');
  const [initialPipelineId, setInitialPipelineId] = useState<string | null>(null);
  const [initialStageId, setInitialStageId] = useState<string | null>(null);
  const [amount, setAmount] = useState<string>('');
  const [personId, setPersonId] = useState<string>(''); 

  // Store State & Actions
  const { pipelines, fetchPipelines, pipelinesLoading, pipelinesError } = usePipelinesStore();

  // Stage related state from useStagesStore
  const {
    stages,
    fetchStages,
    stagesLoading,
    stagesError
  } = useStagesStore();

  // Deals state & actions from useDealsStore
  const { updateDeal: updateDealAction, dealsError, dealsLoading } = useDealsStore();

  // People state from usePeopleStore
  const { people, fetchPeople, peopleLoading, peopleError } = usePeopleStore();

  const [isLoading, setIsLoading] = useState(false); 
  const [error, setError] = useState<string | null>(null); 

  useEffect(() => {
    if (isOpen) {
      fetchPeople(); 
      fetchPipelines();
      // Clear stages using useStagesStore when modal opens, before potentially fetching new ones
      useStagesStore.setState({ stages: [], stagesError: null, stagesLoading: false });
    }
  }, [isOpen, fetchPeople, fetchPipelines]); 

  useEffect(() => {
    if (deal) {
      setName(deal.name || '');
      setAmount(deal.amount != null ? String(deal.amount) : '');
      setPersonId(deal.person_id || ''); 
      setError(null);
      setIsLoading(false);
      
      const pipelineIdFromDeal = deal.stage?.pipeline_id;
      const stageIdFromDeal = deal.stage_id || deal.stage?.id;
      
      setInitialPipelineId(pipelineIdFromDeal || null);
      setInitialStageId(stageIdFromDeal || null);
      setSelectedPipelineId(pipelineIdFromDeal || '');
      setSelectedStageId(''); 
      
    } else {
        setName('');
        setAmount('');
        setPersonId('');
        setSelectedPipelineId('');
        setSelectedStageId('');
        setInitialPipelineId(null);
        setInitialStageId(null);
    }
  }, [deal]);

  useEffect(() => {
    const targetPipelineId = selectedPipelineId || initialPipelineId;
    if (targetPipelineId) {
        fetchStages(targetPipelineId);
    } else {
        // Clear stages if no pipeline is selected, using the new store
        useStagesStore.setState({ stages: [], stagesError: null, stagesLoading: false });
    }
  }, [selectedPipelineId, initialPipelineId, fetchStages]);

  useEffect(() => {
    if (initialStageId && initialPipelineId && selectedPipelineId === initialPipelineId && Array.isArray(stages) && stages.length > 0) {
       const stageExists = stages.some((s: Stage) => s.id === initialStageId);
       if (stageExists) {
           setSelectedStageId(initialStageId);
           setInitialStageId(null); 
       } else {
           console.warn(`Initial stage ID ${initialStageId} not found in loaded stages for pipeline ${initialPipelineId}`);
           setInitialStageId(null); 
       }
    }
  }, [stages, initialStageId, initialPipelineId, selectedPipelineId]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!deal) return; 

    setIsLoading(true);
    setError(null);

    if (!name.trim()) {
      setError('Deal name is required.');
      setIsLoading(false);
      return;
    }
    if (!selectedPipelineId) {
        setError('Pipeline selection is required.');
        setIsLoading(false);
        return;
    }
    if (!selectedStageId) {
        setError('Stage selection is required.');
        setIsLoading(false);
        return;
    }

    try {
      const updateInput: DealInput = {
        name: name.trim(),
        stage_id: selectedStageId,
        amount: amount ? parseFloat(amount) : null,
        person_id: personId || null,
      };

      const updatedDeal = await updateDealAction(deal.id, updateInput);

      if (updatedDeal) {
          onDealUpdated(); 
          onClose();       
      } else {
          setError(dealsError || 'Failed to update deal. Please check store errors.');
      }

    } catch (err: unknown) {
      let message = 'An unexpected error occurred while updating deal.';
      if (err instanceof Error) {
        message = err.message;
      } else if (typeof err === 'string') {
        message = err;
      }
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen || !deal) {
      return null;
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered>
      <ModalOverlay />
      <ModalContent as="form" onSubmit={handleSubmit}>
        <ModalHeader>Edit Deal: {deal.name}</ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={6}>
          {error && (
             <Alert status="error" mb={4} whiteSpace="pre-wrap">
                <AlertIcon />
                {error}
            </Alert>
          )}
          {peopleError && ( 
             <Alert status="warning" mb={4}>
                <AlertIcon />
                {peopleError} 
            </Alert>
          )}
          <VStack spacing={4}>
            <FormControl isRequired isInvalid={!name.trim() && error?.includes('name')}>
              <FormLabel>Deal Name</FormLabel>
              <Input 
                placeholder='Enter deal name' 
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              {error?.toLowerCase().includes('name') && <FormErrorMessage>{error}</FormErrorMessage>}
            </FormControl>

            <FormControl isRequired isInvalid={!selectedPipelineId && error?.toLowerCase().includes('pipeline')}>
              <FormLabel>Pipeline</FormLabel>
              <Select 
                placeholder={pipelinesLoading ? 'Loading pipelines...' : 'Select pipeline'}
                value={selectedPipelineId}
                onChange={(e) => setSelectedPipelineId(e.target.value)}
                isDisabled={pipelinesLoading || !!pipelinesError}
              >
                 {!pipelinesLoading && !pipelinesError && Array.isArray(pipelines) && pipelines.map((pipeline: Pipeline) => (
                    <option key={pipeline.id} value={pipeline.id}>
                        {pipeline.name}
                    </option>
                ))}
              </Select>
              {pipelinesError && <FormErrorMessage>Error loading pipelines: {pipelinesError}</FormErrorMessage>}
              {!selectedPipelineId && error?.toLowerCase().includes('pipeline') && <FormErrorMessage>{error}</FormErrorMessage>}
            </FormControl>

            <FormControl isRequired isInvalid={!selectedStageId && error?.toLowerCase().includes('stage')}>
              <FormLabel>Stage</FormLabel>
              <Select 
                placeholder={stagesLoading ? 'Loading stages...' : (selectedPipelineId ? 'Select stage' : 'Select pipeline first') }
                value={selectedStageId}
                onChange={(e) => setSelectedStageId(e.target.value)}
                isDisabled={!selectedPipelineId || stagesLoading || !!stagesError || stages.length === 0}
              >
                 {!stagesLoading && !stagesError && stages.map((stage: Stage) => (
                    <option key={stage.id} value={stage.id}>
                        {stage.name} (Order: {stage.order})
                    </option>
                ))}
              </Select>
              {stagesError && <FormErrorMessage>Error loading stages: {stagesError}</FormErrorMessage>}
              {!selectedPipelineId && stages.length === 0 && <FormErrorMessage>Select a pipeline to see stages.</FormErrorMessage>}
              {!selectedStageId && error?.toLowerCase().includes('stage') && <FormErrorMessage>{error}</FormErrorMessage>}
            </FormControl>

            <FormControl>
              <FormLabel>Amount</FormLabel>
              <NumberInput value={amount} onChange={(valueAsString) => setAmount(valueAsString)}>
                <NumberInputField placeholder='Enter amount (optional)' />
              </NumberInput>
            </FormControl>

            <FormControl>
              <FormLabel>Link to Person (Optional)</FormLabel>
                <Select 
                placeholder={peopleLoading ? 'Loading people...' : 'Select person'}
                  value={personId}
                  onChange={(e) => setPersonId(e.target.value)}
                isDisabled={peopleLoading || !!peopleError}
                >
                 {!peopleLoading && !peopleError && Array.isArray(people) && people.map((person: Person) => (
                      <option key={person.id} value={person.id}>
                        {[person.first_name, person.last_name].filter(Boolean).join(' ') || person.email || `Person ID: ${person.id}`}
                      </option>
                  ))}
                </Select>
            </FormControl>
          </VStack>
        </ModalBody>
        <ModalFooter>
          <Button 
            colorScheme='blue' 
            mr={3} 
            type="submit" 
            isLoading={isLoading || dealsLoading} 
            leftIcon={(isLoading || dealsLoading) ? <Spinner size="sm" /> : undefined}
            onClick={handleSubmit}
          >
            Save Changes
          </Button>
          <Button variant='ghost' onClick={onClose} isDisabled={isLoading}>
            Cancel
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

export default EditDealModal; 