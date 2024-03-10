'use server'

import { z } from 'zod'
import { sql } from '@vercel/postgres';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { signIn } from '@/auth';
import { AuthError } from 'next-auth';

//import { Invoice } from './definitions'

const FormSchema = z.object({
  id: z.string(),
  customerId: z.string({
    invalid_type_error: 'Customer ID is required',
  }),
  amount: z.coerce.number().gt(0, { message: 'Amount must be greater than 0' }),
  status: z.enum(['pending', 'paid'], {
    invalid_type_error: 'Status must be pending or paid' 
  }),
  date: z.string(),
});

const CreateInvoice = FormSchema.omit({id: true, date: true}); //because id and date are not required

//NOTE: Create
//export async function createInvoice(formData: FormData) {
//now with react dom form
export type State = {
  errors?: {
    customerId?: string[];
    amount?: string[];
    status?: string[];
  };
  message?: string | null;
};

//NOTE: not gonna use for while prevState
//export async function createInvoice(prevState: State,formData: FormData) {
export async function createInvoice(prevState: State, formData: FormData) {
  /* const invoice = {
    customer_id: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  }; */

  //const { customerId, amount, status } = CreateInvoice.parse(Object.fromEntries(formData.entries()));
  //NOTE: change to use safeParse
  const validatedFields = CreateInvoice.safeParse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Validation Error: Failed to Create Invoice.',
    };
  }
  const { customerId, amount, status } = validatedFields.data;

  const amountInt = Number(amount * 100);

  const [date] = new Date().toISOString().split('T');

  //await sql<typeof FormSchema>`INSERT INTO invoices (customer_id, amount, status, date) VALUES (${customerId}, ${amountInt}, ${status}, ${date})`;
  try {
    await sql`
      INSERT INTO invoices (customer_id, amount, status, date)
      VALUES (${customerId}, ${amountInt}, ${status}, ${date})
    `;
  } catch (error) {
    return {
      message: 'Database Error: Failed to Create Invoice.',
    };
  }

  revalidatePath('/dashboard/invoices');
  redirect('/dashboard/invoices');
}

//NOTE: Update
const UpdateInvoice = FormSchema.omit({id: true, date: true});
//export async function updateInvoice(id: string, formData: FormData) {
export async function updateInvoice(id: string, prevState: State, formData: FormData) {
  //const { customerId, amount, status } = UpdateInvoice.parse(Object.fromEntries(formData.entries()));
  const validatedFields = UpdateInvoice.safeParse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Validation Error: Failed to Update Invoice.',
    };
  }
  const { customerId, amount, status } = validatedFields.data;

  const amountInt = Number(amount * 100);

  //await sql<typeof FormSchema>`UPDATE invoices SET customer_id = ${customerId}, amount = ${amountInt}, status = ${status} WHERE id = ${id}`;
  try {
    await sql`
        UPDATE invoices
        SET customer_id = ${customerId}, amount = ${amountInt}, status = ${status}
        WHERE id = ${id}
      `;
  } catch (error) {
    return { message: 'Database Error: Failed to Update Invoice.' };
  }

  revalidatePath('/dashboard/invoices');
  redirect('/dashboard/invoices');
}

//NOTE: Delete
export async function deleteInvoice(id: string) {
  //await sql`DELETE FROM invoices WHERE id = ${id}`;
  //evalidatePath('/dashboard/invoices');

  throw new Error('Failed to Delete Invoice');
  try {
    await sql`DELETE FROM invoices WHERE id = ${id}`;
    revalidatePath('/dashboard/invoices');
    return { message: 'Deleted Invoice.' };
  } catch (error) {
    return { message: 'Database Error: Failed to Delete Invoice.' };
  }
}




//NOTE: for authentication

export async function authenticate(
  prevState: string| undefined,
  formData: FormData
) {
  try {
    await signIn('credentials', formData)
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case 'CredentialsSignin':
          return 'Invalid email or password.';
        default:
          return 'Failed to authenticate.';
      }
    }
    throw error;
  }
}
