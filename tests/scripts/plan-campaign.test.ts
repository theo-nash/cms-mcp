import axios from 'axios';

const API_BASE_URL = 'http://localhost:3000/api/v1';

async function testPlanAndCampaignStates() {
    try {
        // Create a brand first
        const brandResponse = await axios.post(`${API_BASE_URL}/brands`, {
            name: 'Test Brand for Plans',
            description: 'Brand for testing plan and campaign operations',
            guidelines: {
                tone: ['professional'],
                vocabulary: ['innovative'],
                avoidedTerms: ['cheap'],
                visualIdentity: {
                    primaryColor: '#000000',
                    secondaryColor: '#FFFFFF'
                }
            }
        });
        const brandId = brandResponse.data._id;
        console.log('Created brand:', brandId);

        // Create a campaign
        const campaignResponse = await axios.post(`${API_BASE_URL}/campaigns`, {
            name: 'Test Campaign',
            description: 'Campaign for testing state changes',
            startDate: new Date().toISOString(),
            endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            objectives: ['Increase brand awareness', 'Drive engagement']
        });
        const campaignId = campaignResponse.data._id;
        console.log('Created campaign:', campaignId);

        // Test campaign state transitions
        console.log('\nTesting campaign state transitions:');

        // Move to active state
        await axios.patch(`${API_BASE_URL}/campaigns/${campaignId}/status`, {
            status: 'active'
        });
        console.log('Campaign moved to active state');

        // Create a master plan
        const masterPlanResponse = await axios.post(`${API_BASE_URL}/plans`, {
            brandId,
            campaignId,
            title: 'Test Master Plan',
            type: 'master',
            dateRange: {
                start: new Date().toISOString(),
                end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
            },
            goals: ['Increase engagement'],
            targetAudience: 'Tech professionals',
            channels: ['twitter'],
            state: 'draft',
            stateMetadata: {
                updatedBy: 'test-script',
                comments: 'Created by test script'
            }
        });
        const masterPlanId = masterPlanResponse.data._id;
        console.log('Created master plan:', masterPlanId);

        // Test plan state transitions
        console.log('\nTesting plan state transitions:');

        // Move to review state
        await axios.patch(`${API_BASE_URL}/plans/${masterPlanId}/state`, {
            state: 'review',
            comments: 'Plan ready for review'
        });
        console.log('Plan moved to review state');

        // Move to approved state
        await axios.patch(`${API_BASE_URL}/plans/${masterPlanId}/state`, {
            state: 'approved',
            comments: 'Plan approved'
        });
        console.log('Plan moved to approved state');

        // Move to active state
        await axios.patch(`${API_BASE_URL}/plans/${masterPlanId}/state`, {
            state: 'active',
            comments: 'Plan activated'
        });
        console.log('Plan moved to active state');

        // Create a micro plan
        const microPlanResponse = await axios.post(`${API_BASE_URL}/plans`, {
            brandId,
            parentPlanId: masterPlanId,
            title: 'Test Micro Plan',
            type: 'micro',
            dateRange: {
                start: new Date().toISOString(),
                end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
            },
            goals: ['Weekly engagement boost'],
            targetAudience: 'Tech professionals',
            channels: ['twitter'],
            state: 'draft',
            stateMetadata: {
                updatedBy: 'test-script',
                comments: 'Created by test script'
            }
        });
        const microPlanId = microPlanResponse.data._id;
        console.log('Created micro plan:', microPlanId);

        // Test error cases
        console.log('\nTesting error cases:');

        try {
            // Try to move micro plan to active without parent being active (should fail)
            await axios.patch(`${API_BASE_URL}/plans/${microPlanId}/state`, {
                state: 'active',
                comments: 'Trying to activate micro plan'
            });
        } catch (error) {
            console.log('Expected error when activating micro plan:', error.response?.data);
        }

        // Clean up
        console.log('\nCleaning up test data:');
        await axios.delete(`${API_BASE_URL}/plans/${microPlanId}`);
        console.log('Deleted micro plan');
        await axios.delete(`${API_BASE_URL}/plans/${masterPlanId}`);
        console.log('Deleted master plan');
        await axios.delete(`${API_BASE_URL}/campaigns/${campaignId}`);
        console.log('Deleted campaign');
        await axios.delete(`${API_BASE_URL}/brands/${brandId}`);
        console.log('Deleted brand');

    } catch (error) {
        console.error('Test failed:', error.response?.data || error.message);
        process.exit(1);
    }
}

// Run the tests
testPlanAndCampaignStates().catch(console.error); 