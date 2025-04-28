import axios from 'axios';

const API_BASE_URL = 'http://localhost:3000/api/v1';

interface Campaign {
    _id: string;
    name: string;
    description: string;
    startDate: string;
    endDate: string;
    objectives: string[];
    status: 'draft' | 'active' | 'completed' | 'archived';
    created_at: string;
    updated_at: string;
}

async function testAdvancedCampaignScenarios() {
    try {
        // Create a brand first
        const brandResponse = await axios.post(`${API_BASE_URL}/brands`, {
            name: 'Advanced Test Brand',
            description: 'Brand for testing advanced campaign scenarios',
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

        // Test Campaign Creation with Invalid Dates
        console.log('\nTesting invalid campaign creation:');
        try {
            await axios.post(`${API_BASE_URL}/campaigns`, {
                name: 'Invalid Campaign',
                description: 'Campaign with invalid dates',
                startDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // End date before start date
                endDate: new Date().toISOString(),
                objectives: ['Test objective']
            });
        } catch (error) {
            console.log('Expected error for invalid dates:', error.response?.data);
        }

        // Create Multiple Campaigns
        console.log('\nCreating multiple campaigns:');
        const campaigns: Campaign[] = [];
        for (let i = 1; i <= 3; i++) {
            const campaignResponse = await axios.post<Campaign>(`${API_BASE_URL}/campaigns`, {
                name: `Test Campaign ${i}`,
                description: `Campaign ${i} for testing multiple scenarios`,
                startDate: new Date(Date.now() + i * 7 * 24 * 60 * 60 * 1000).toISOString(),
                endDate: new Date(Date.now() + (i + 4) * 7 * 24 * 60 * 60 * 1000).toISOString(),
                objectives: [`Objective ${i}.1`, `Objective ${i}.2`]
            });
            campaigns.push(campaignResponse.data);
            console.log(`Created campaign ${i}:`, campaignResponse.data._id);
        }

        // Test Campaign Status Transitions
        console.log('\nTesting campaign status transitions:');

        // Test invalid status transition
        try {
            await axios.patch(`${API_BASE_URL}/campaigns/${campaigns[0]._id}/status`, {
                status: 'completed' // Should fail as campaign hasn't been active
            });
        } catch (error) {
            console.log('Expected error for invalid status transition:', error.response?.data);
        }

        // Test valid status transitions
        await axios.patch(`${API_BASE_URL}/campaigns/${campaigns[0]._id}/status`, {
            status: 'active'
        });
        console.log('Campaign 1 moved to active state');

        await axios.patch(`${API_BASE_URL}/campaigns/${campaigns[0]._id}/status`, {
            status: 'completed'
        });
        console.log('Campaign 1 moved to completed state');

        // Test Campaign Updates
        console.log('\nTesting campaign updates:');

        try {
            await axios.put(`${API_BASE_URL}/campaigns/${campaigns[1]._id}`, {
                name: 'Updated Campaign',
                description: 'Updated description',
                objectives: ['New objective 1', 'New objective 2']
            });
            console.log('Successfully updated campaign');
        } catch (error) {
            console.error('Error updating campaign:', error.response?.data);
        }

        // Test Campaign Filtering
        console.log('\nTesting campaign filtering:');

        const activeResponse = await axios.get<Campaign[]>(`${API_BASE_URL}/campaigns?status=active`);
        console.log('Active campaigns count:', activeResponse.data.length);

        const completedResponse = await axios.get<Campaign[]>(`${API_BASE_URL}/campaigns?status=completed`);
        console.log('Completed campaigns count:', completedResponse.data.length);

        // Test Campaign Date Range Queries
        console.log('\nTesting campaign date range queries:');

        const futureDate = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString();
        const dateRangeResponse = await axios.get<Campaign[]>(
            `${API_BASE_URL}/campaigns?startBefore=${futureDate}`
        );
        console.log('Campaigns starting before future date:', dateRangeResponse.data.length);

        // Clean up
        console.log('\nCleaning up test data:');
        for (const campaign of campaigns) {
            await axios.delete(`${API_BASE_URL}/campaigns/${campaign._id}`);
            console.log('Deleted campaign:', campaign._id);
        }
        await axios.delete(`${API_BASE_URL}/brands/${brandId}`);
        console.log('Deleted brand');

    } catch (error) {
        console.error('Test failed:', error.response?.data || error.message);
        process.exit(1);
    }
}

// Run the tests
testAdvancedCampaignScenarios().catch(console.error); 