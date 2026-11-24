import { URL } from 'node:url';
import { MarketplaceAdapter } from './adapter_interface';
import { AmazonIndiaAdapter } from './amazon_adapter';
import { FlipkartAdapter } from './flipkart_adapter';
import { MyntraAdapter } from './myntra_adapter';
import { NykaaAdapter } from './nykaa_adapter';
import { DecathlonAdapter } from './decathlon_adapter';
import { CromaAdapter } from './croma_adapter';
import { AdidasAdapter } from './adidas_adapter';
import { SonataWatchAdapter } from './sonata_adapter';
import { GenericEcomAdapter } from './generic_adapter';

export * from './adapter_interface';
export * from './amazon_adapter';
export * from './flipkart_adapter';
export * from './myntra_adapter';
export * from './nykaa_adapter';
export * from './decathlon_adapter';
export * from './croma_adapter';
export * from './adidas_adapter';
export * from './sonata_adapter';
export * from './generic_adapter';

export class MarketplaceAdapterRegistry {
  private adapters: MarketplaceAdapter[];

  constructor() {
    this.adapters = [
      new AmazonIndiaAdapter(),
      new FlipkartAdapter(),
      new MyntraAdapter(),
      new NykaaAdapter(),
      new DecathlonAdapter(),
      new CromaAdapter(),
      new AdidasAdapter(),
      new SonataWatchAdapter(),
      new GenericEcomAdapter(),
    ];
  }

  getAdapter(url: URL): MarketplaceAdapter {
    for (const adapter of this.adapters) {
      if (adapter.canHandle(url)) {
        return adapter;
      }
    }
    return this.adapters[this.adapters.length - 1]; // Generic fallback
  }
}

export const adapterRegistry = new MarketplaceAdapterRegistry();
