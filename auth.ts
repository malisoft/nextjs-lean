import NextAuth from 'next-auth';

import { authConfig } from './auth.config'

import Credentials from 'next-auth/providers/credentials'
import { z } from 'zod';
//for credentials
import {sql} from '@vercel/postgres'
import type { User } from '@/app/lib/definitions';
import bcrypt from 'bcrypt'
import { getUser } from './app/lib/data';


export const { auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [Credentials({
    async authorize(credentials) {
      const parsedCredentials = z.object({
        email: z.string().email(),
        password: z.string().min(6),
      }).safeParse(credentials);

      if (parsedCredentials.success) {
        const {email, password} = parsedCredentials.data;
        const user: User = await getUser(email);
        if (!user) return null;

        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (isPasswordValid) return user;
      }

      console.log('invalid credentials');
      return null
    }
  })]
});
