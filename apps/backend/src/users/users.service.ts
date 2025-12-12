import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { User, UserProfile } from '@omnifit/shared';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: any): Promise<User> {
    const user = await this.prisma.user.create({
      data,
      include: {
        profile: true,
      },
    });

    // Create default profile
    if (!user.profile) {
      await this.prisma.userProfile.create({
        data: {
          userId: user.id,
          activityLevel: 'MODERATE',
          timezone: 'UTC',
          language: 'en',
          fitnessGoals: [],
          spiritualGoals: [],
        },
      });
    }

    return user;
  }

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
      include: {
        profile: true,
      },
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
      include: {
        profile: true,
      },
    });
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { username },
      include: {
        profile: true,
      },
    });
  }

  async updateLastLogin(id: string): Promise<void> {
    await this.prisma.user.update({
      where: { id },
      data: {
        lastLoginAt: new Date(),
      },
    });
  }

  async updateProfile(userId: string, profileData: Partial<UserProfile>): Promise<UserProfile> {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.prisma.userProfile.upsert({
      where: { userId },
      update: profileData,
      create: {
        userId,
        ...profileData,
        activityLevel: profileData.activityLevel || 'MODERATE',
        timezone: profileData.timezone || 'UTC',
        language: profileData.language || 'en',
        fitnessGoals: profileData.fitnessGoals || [],
        spiritualGoals: profileData.spiritualGoals || [],
      },
    });
  }

  async updateStreakStats(userId: string, streakData: any): Promise<void> {
    await this.prisma.userProfile.update({
      where: { userId },
      data: streakData,
    });
  }

  async updateTokenBalance(userId: string, amount: number): Promise<void> {
    await this.prisma.userProfile.update({
      where: { userId },
      data: {
        totalTokens: {
          increment: amount,
        },
      },
    });
  }
}