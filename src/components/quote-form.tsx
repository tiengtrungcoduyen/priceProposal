'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useFieldArray, useForm } from 'react-hook-form';
import * as z from 'zod';
import { useMemo, useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';

const formSchema = z.object({
  bidderName: z.string().min(2, { message: 'Tên phải có ít nhất 2 ký tự.' }),
  materials: z.array(
    z.object({
      id: z.any(),
      name: z.string(),
      unit: z.string(),
      quantity: z.number(),
      price: z.preprocess(
        (val) => (val === '' ? 0 : Number(val)),
        z.number().min(0, { message: 'Giá phải là số dương.' })
      ),
      total: z.number(),
      note: z.string().optional(),
    })
  ),
});

type FormValues = z.infer<typeof formSchema>;

const currencyFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
});

export function QuoteForm() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingMaterials, setIsLoadingMaterials] = useState(true);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      bidderName: '',
      materials: [],
    },
    mode: 'onChange',
  });

  useEffect(() => {
    async function fetchMaterials() {
      setIsLoadingMaterials(true);
      try {
        const apiUrl = process.env.NEXT_PUBLIC_APP_URL;
        if (!apiUrl) {
          throw new Error("Vui lòng định cấu hình NEXT_PUBLIC_APP_URL trong tệp .env.local của bạn.");
        }

        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ type: 'getRequestData', payload: undefined }),
        });

        if (!response.ok) {
          throw new Error('Không thể tải danh sách vật tư.');
        }

        const data = await response.json();
        const materialsFromApi = data.map((m: any) => ({
          ...m,
          price: 0,
          total: 0,
          note: m.note || '',
        }));

        form.reset({ materials: materialsFromApi });
      } catch (error: any) {
        toast({
          variant: 'destructive',
          title: 'Lỗi!',
          description: error.message || 'Không thể tải danh sách vật tư.',
        });
      } finally {
        setIsLoadingMaterials(false);
      }
    }
    fetchMaterials();
  }, [form, toast]);

  const { fields } = useFieldArray({
    control: form.control,
    name: 'materials',
  });

  const watchedMaterials = form.watch('materials');

  const totalQuote = useMemo(() => {
    return watchedMaterials.reduce(
      (acc, current) => acc + (current.quantity || 0) * (current.price || 0),
      0
    );
  }, [watchedMaterials]);

  async function onSubmit(data: FormValues) {
    setIsSubmitting(true);
    const submissionData = {
        ...data,
        materials: data.materials.map(m => ({...m, total: m.quantity * m.price})),
        totalQuote,
    };

    try {
      const apiUrl = process.env.NEXT_PUBLIC_APP_URL;
      if (!apiUrl) {
        throw new Error("Vui lòng định cấu hình NEXT_PUBLIC_APP_URL trong tệp .env.local của bạn.");
      }

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submissionData),
      });

      if (!response.ok) {
        throw new Error('Yêu cầu gửi báo giá không thành công.');
      }
      
      toast({
        title: 'Thành công!',
        description: 'Báo giá của bạn đã được gửi đi.',
      });
      
      const materials = form.getValues('materials').map(m => ({...m, price: 0, note: ''}));
      form.reset({
          bidderName: data.bidderName,
          materials
      });

    } catch (error: any) {
      console.error('Submission failed:', error);
      toast({
        variant: 'destructive',
        title: 'Lỗi!',
        description: error.message || 'Không thể gửi báo giá. Vui lòng thử lại.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Thông tin nhà thầu</CardTitle>
            <CardDescription>
              Vui lòng nhập tên của bạn hoặc công ty.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="bidderName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tên nhà thầu</FormLabel>
                  <FormControl>
                    <Input placeholder="Ví dụ: Công ty TNHH Xây dựng ABC" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Danh sách vật tư</CardTitle>
            <CardDescription>
              Nhập đơn giá cho từng loại vật tư. Tổng tiền sẽ được tự động tính toán.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingMaterials ? (
              <div className="flex items-center justify-center h-40">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40px] hidden sm:table-cell">STT</TableHead>
                      <TableHead>Tên vật tư</TableHead>
                      <TableHead className="text-right">Số lượng</TableHead>
                      <TableHead className="hidden sm:table-cell text-right">Đơn vị</TableHead>
                      <TableHead className="w-[150px] text-right">Đơn giá (VNĐ)</TableHead>
                      <TableHead className="w-[180px]">Ghi chú</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fields.map((field, index) => (
                        <TableRow key={field.id}>
                          <TableCell className="font-medium hidden sm:table-cell">{index + 1}</TableCell>
                          <TableCell className="font-medium">{field.name}</TableCell>
                          <TableCell className="text-right">{field.quantity.toLocaleString('vi-VN')}</TableCell>
                          <TableCell className="hidden sm:table-cell text-right">{field.unit}</TableCell>
                          <TableCell>
                            <FormField
                              control={form.control}
                              name={`materials.${index}.price`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      className="text-right"
                                      placeholder="0"
                                      min="0"
                                      {...field}
                                      onChange={(e) => {
                                          field.onChange(e.target.valueAsNumber || 0);
                                      }}
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                          </TableCell>
                          <TableCell>
                            <FormField
                              control={form.control}
                              name={`materials.${index}.note`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <Input
                                      placeholder="Nhập ghi chú..."
                                      {...field}
                                      value={field.value ?? ''}
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                          </TableCell>
                        </TableRow>
                      )
                    )}
                  </TableBody>
                  <TableFooter>
                    <TableRow>
                      <TableCell colSpan={4} className="hidden sm:table-cell"></TableCell>
                      <TableCell colSpan={1} className="sm:col-span-1 text-right font-bold text-lg">Tổng cộng</TableCell>
                      <TableCell className="text-right font-bold text-primary text-lg">
                        {currencyFormatter.format(totalQuote)}
                      </TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-end">
            <Button type="submit" disabled={isSubmitting || isLoadingMaterials} size="lg" style={{ backgroundColor: 'hsl(var(--accent))', color: 'hsl(var(--accent-foreground))' }} className="hover:opacity-90 transition-opacity">
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang gửi...
                </>
              ) : (
                'Gửi báo giá'
              )}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </Form>
  );
}
