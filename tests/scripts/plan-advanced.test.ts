import axios from 'axios';

const API_BASE_URL = 'http://localhost:3000/api/v1';

interface Plan {
    _id: string;
    brandId: string;
    title: string;
    type: 'master' | 'micro';
    parentPlanId?: string;
    campaignId?: string;
    dateRange: {
        start: string;
        end: string;
    };
    goals: string[];
    targetAudience: string;
    channels: string[];
    state: 'draft' | 'review' | 'approved' | 'active';
    stateMetadata: {
        version: number;
        updatedAt: string;
        updatedBy: string;
        comments?: string;
    };
    isActive: boolean;
    created_at: string;
    updated_at: string;
}

async function testAdvancedPlanScenarios() {
    try {
        // Create a brand first
        const brandResponse = await axios.post(`${API_BASE_URL}/brands`, {
            name: 'Advanced Plan Test Brand',
            description: 'Brand for testing advanced plan scenarios',
            guidelines: {
                tone: ['professional', 'innovative'],
                vocabulary: ['cutting-edge', 'sustainable'],
                avoidedTerms: ['basic', 'simple'],
                visualIdentity: {
                    primaryColor: '#FF0000',
                    secondaryColor: '#00FF00'
                }
            }
        });
        const brandId = brandResponse.data._id;
        console.log('Created brand:', brandId);

        // Create a campaign
        const campaignResponse = await axios.post(`${API_BASE_URL}/campaigns`, {
            name: 'Advanced Plan Test Campaign',
            description: 'Campaign for testing advanced plan scenarios',
            startDate: new Date().toISOString(),
            endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
            objectives: ['Test advanced plan scenarios']
        });
        const campaignId = campaignResponse.data._id;
        console.log('Created campaign:', campaignId);

        // Test Plan Creation with Invalid Dates
        console.log('\nTesting invalid plan creation:');
        try {
            await axios.post(`${API_BASE_URL}/plans`, {
                brandId,
                title: 'Invalid Plan',
                type: 'master',
                dateRange: {
                    start: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // End date before start date
                    end: new Date().toISOString()
                },
                goals: ['Test goal'],
                targetAudience: 'Test audience',
                channels: ['twitter']
            });
        } catch (error) {
            console.log('Expected error for invalid dates:', error.response?.data);
        }

        // Create Master Plan
        console.log('\nCreating master plan:');
        const masterPlanResponse = await axios.post<Plan>(`${API_BASE_URL}/plans`, {
            brandId,
            campaignId,
            title: 'Master Test Plan',
            type: 'master',
            dateRange: {
                start: new Date().toISOString(),
                end: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()
            },
            goals: ['Master plan goal 1', 'Master plan goal 2'],
            targetAudience: 'Tech professionals',
            channels: ['twitter', 'linkedin'],
            state: 'draft',
            stateMetadata: {
                updatedBy: 'test-script',
                comments: 'Created by test script'
            }
        });
        const masterPlanId = masterPlanResponse.data._id;
        console.log('Created master plan:', masterPlanId);

        // Create Multiple Micro Plans
        console.log('\nCreating micro plans:');
        const microPlans: Plan[] = [];
        for (let i = 1; i <= 3; i++) {
            const microPlanResponse = await axios.post<Plan>(`${API_BASE_URL}/plans`, {
                brandId,
                parentPlanId: masterPlanId,
                title: `Micro Plan ${i}`,
                type: 'micro',
                dateRange: {
                    start: new Date(Date.now() + (i - 1) * 7 * 24 * 60 * 60 * 1000).toISOString(),
                    end: new Date(Date.now() + i * 7 * 24 * 60 * 60 * 1000).toISOString()
                },
                goals: [`Micro plan ${i} goal`],
                targetAudience: 'Tech professionals',
                channels: ['twitter'],
                state: 'draft',
                stateMetadata: {
                    updatedBy: 'test-script',
                    comments: `Micro plan ${i} created by test script`
                }
            });
            microPlans.push(microPlanResponse.data);
            console.log(`Created micro plan ${i}:`, microPlanResponse.data._id);
        }

        // Test Plan State Transitions
        console.log('\nTesting plan state transitions:');

        // Test invalid state transition for micro plan
        try {
            await axios.patch(`${API_BASE_URL}/plans/${microPlans[0]._id}/state`, {
                state: 'active',
                comments: 'Trying to activate micro plan before master plan'
            });
        } catch (error) {
            console.log('Expected error when activating micro plan before master:', error.response?.data);
        }

        // Test master plan state transitions
        const states: ('review' | 'approved' | 'active')[] = ['review', 'approved', 'active'];
        for (const state of states) {
            await axios.patch(`${API_BASE_URL}/plans/${masterPlanId}/state`, {
                state,
                comments: `Moving master plan to ${state}`
            });
            console.log(`Master plan moved to ${state} state`);
        }

        // Now test micro plan state transitions
        for (const state of states) {
            await axios.patch(`${API_BASE_URL}/plans/${microPlans[0]._id}/state`, {
                state,
                comments: `Moving micro plan to ${state}`
            });
            console.log(`Micro plan moved to ${state} state`);
        }

        // Test Plan Filtering
        console.log('\nTesting plan filtering:');

        const activePlans = await axios.get<Plan[]>(`${API_BASE_URL}/plans?state=active`);
        console.log('Active plans count:', activePlans.data.length);

        const microPlansResponse = await axios.get<Plan[]>(`${API_BASE_URL}/plans?type=micro&brandId=${brandId}`);
        console.log('Micro plans for brand count:', microPlansResponse.data.length);

        // Test Plan Updates
        console.log('\nTesting plan updates:');

        try {
            await axios.put(`${API_BASE_URL}/plans/${microPlans[1]._id}`, {
                title: 'Updated Micro Plan',
                goals: ['Updated goal 1', 'Updated goal 2'],
                targetAudience: 'Updated audience',
                channels: ['twitter', 'linkedin']
            });
            console.log('Successfully updated micro plan');
        } catch (error) {
            console.error('Error updating micro plan:', error.response?.data);
        }

        // Clean up
        console.log('\nCleaning up test data:');
        for (const plan of microPlans) {
            await axios.delete(`${API_BASE_URL}/plans/${plan._id}`);
            console.log('Deleted micro plan:', plan._id);
        }
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
testAdvancedPlanScenarios().catch(console.error); 