import { Blocks } from 'lucide-react';
import { type ComponentProps } from 'react';
import { cn } from '@/lib/utils';

export function Logo({ className, ...props }: ComponentProps<typeof Blocks>) {
    return <Blocks className={cn('h-8 w-8', className)} {...props} />;
}
