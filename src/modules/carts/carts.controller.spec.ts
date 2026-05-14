jest.mock('../../common/guards/clerk-auth.guard', () => ({
  ClerkAuthGuard: class ClerkAuthGuard {},
}));

jest.mock('../../common/guards/roles.guard', () => ({
  RolesGuard: class RolesGuard {},
}));

import { Test, TestingModule } from '@nestjs/testing';
import { CartsController } from './carts.controller';
import { CartsService } from './carts.service';

describe('CartsController', () => {
  let controller: CartsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CartsController],
      providers: [
        {
          provide: CartsService,
          useValue: {
            getCart: jest.fn(),
            addToCart: jest.fn(),
            removeFromCart: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<CartsController>(CartsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
