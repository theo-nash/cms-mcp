import axios from 'axios';

const API_BASE_URL = 'http://localhost:3000/api/v1';
const MAX_RETRIES = 30;
const RETRY_INTERVAL = 1000;

interface Content {
    _id: string;
    planId: string;
    brandId: string;
    title: string;
    content: string;
    state: string;
    stateMetadata: {
        updatedAt: string;
        updatedBy: string;
        comments?: string;
    };
    created_at: string;
}

async function waitForServer() {
    for (let i = 0; i < MAX_RETRIES; i++) {
        try {
            await axios.get(`${API_BASE_URL}/health`);
            console.log('Server is ready');
            return;
        } catch (error) {
            console.log(`Waiting for server... (${i + 1}/${MAX_RETRIES})`);
            await new Promise(resolve => setTimeout(resolve, RETRY_INTERVAL));
        }
    }
    throw new Error('Server did not become ready in time');
}

async function testContentOperations() {
    try {
        await waitForServer();

        // Create a brand first
        const brandResponse = await axios.post(`${API_BASE_URL}/brands`, {
            name: 'Test Brand',
            description: 'Brand for testing content operations',
            guidelines: {
                tone: ['professional', 'friendly'],
                vocabulary: ['innovative', 'sustainable'],
                avoidedTerms: ['cheap', 'low-quality'],
                visualIdentity: {
                    primaryColor: '#000000',
                    secondaryColor: '#FFFFFF'
                }
            }
        });
        const brandId = brandResponse.data._id;
        console.log('Created brand:', brandId);

        // Create a plan
        const planResponse = await axios.post(`${API_BASE_URL}/plans`, {
            brandId,
            title: 'Test Plan',
            type: 'master',
            dateRange: {
                start: new Date().toISOString(),
                end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
            },
            goals: ['Increase engagement', 'Grow followers'],
            targetAudience: 'Tech professionals',
            channels: ['twitter'],
            state: 'draft',
            stateMetadata: {
                updatedBy: 'test-script',
                comments: 'Created by test script'
            }
        });
        const planId = planResponse.data._id;
        console.log('Created plan:', planId);

        // Create content
        const contentResponse = await axios.post(`${API_BASE_URL}/content`, {
            planId,
            brandId,
            title: 'Test Content',
            content: 'This is a test tweet',
            state: 'draft',
            stateMetadata: {
                updatedBy: 'test-script',
                comments: 'Created by test script'
            }
        });
        const contentId = contentResponse.data._id;
        console.log('Created content:', contentId);

        // Test content state transitions
        console.log('\nTesting content state transitions:');

        // Move to ready state
        await axios.patch(`${API_BASE_URL}/content/${contentId}/state`, {
            state: 'ready',
            comments: 'Content is ready for review'
        });
        console.log('Content moved to ready state');

        // Move to published state
        await axios.patch(`${API_BASE_URL}/content/${contentId}/state`, {
            state: 'published',
            comments: 'Content published successfully'
        });
        console.log('Content moved to published state');

        // Test error cases
        console.log('\nTesting error cases:');

        try {
            // Try to move back to draft (should fail)
            await axios.patch(`${API_BASE_URL}/content/${contentId}/state`, {
                state: 'draft',
                comments: 'Trying to move back to draft'
            });
        } catch (error) {
            console.log('Expected error when moving back to draft:', error.response?.data);
        }

        // Clean up
        console.log('\nCleaning up test data:');
        await axios.delete(`${API_BASE_URL}/content/${contentId}`);
        console.log('Deleted content');
        await axios.delete(`${API_BASE_URL}/plans/${planId}`);
        console.log('Deleted plan');
        await axios.delete(`${API_BASE_URL}/brands/${brandId}`);
        console.log('Deleted brand');

    } catch (error) {
        console.error('Test failed:', error.response?.data || error.message);
        process.exit(1);
    }
}

// Run the tests
testContentOperations()
    .then(() => {
        console.log('Tests completed successfully');
        process.exit(0);
    })
    .catch(error => {
        console.error('Tests failed:', error);
        process.exit(1);
    }); 