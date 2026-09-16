import { NextRequest } from 'next/server';
import HomeClient, { HomeProductsResponse } from './HomeClient';
import { GET as getHomeProductsResponse } from './api/home-products/route';
import { GET as getWeeklyCampaignsResponse } from './api/weekly-campaigns/route';
import {
  defaultWeeklyCampaignConfig,
  getWeeklyCampaignSet,
  normalizeWeeklyCampaignConfig,
} from '@/lib/weeklyCampaigns';

export const revalidate = 300;

const INITIAL_PRODUCT_LIMIT = 6;

function limitInitialProducts(payload: HomeProductsResponse): HomeProductsResponse {
  return {
    laptops: (payload.laptops ?? []).slice(0, INITIAL_PRODUCT_LIMIT),
    smartphones: (payload.smartphones ?? []).slice(0, INITIAL_PRODUCT_LIMIT),
    bestSellers: (payload.bestSellers ?? []).slice(0, INITIAL_PRODUCT_LIMIT),
    sales: (payload.sales ?? []).slice(0, INITIAL_PRODUCT_LIMIT),
    latest: (payload.latest ?? []).slice(0, INITIAL_PRODUCT_LIMIT),
    components: (payload.components ?? []).slice(0, INITIAL_PRODUCT_LIMIT),
    weeklyLaptops: (payload.weeklyLaptops ?? []).slice(0, INITIAL_PRODUCT_LIMIT),
  };
}

export default async function HomePage() {
  let campaignConfig = defaultWeeklyCampaignConfig;

  try {
    const response = await getWeeklyCampaignsResponse();
    if (response.ok) {
      campaignConfig = normalizeWeeklyCampaignConfig(await response.json());
    }
  } catch (error) {
    console.error('Error preloading weekly campaigns:', error instanceof Error ? error.message : 'unknown error');
  }

  const campaigns = getWeeklyCampaignSet(campaignConfig);
  let initialProducts: HomeProductsResponse | null = null;

  try {
    const url = new URL('http://localhost/api/home-products');
    url.searchParams.set('laptop_brand', campaigns.laptops.brand);
    url.searchParams.set('smartphone_brand', campaigns.smartphones.brand);
    const response = await getHomeProductsResponse(new NextRequest(url));

    if (response.ok) {
      initialProducts = limitInitialProducts(await response.json() as HomeProductsResponse);
    }
  } catch (error) {
    console.error('Error preloading home products for SSR:', error instanceof Error ? error.message : 'unknown error');
  }

  return <HomeClient initialProducts={initialProducts} initialCampaigns={campaigns} />;
}
