'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useFieldArray, useForm } from 'react-hook-form';
import * as z from 'zod';
import { useState, useEffect } from 'react';
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
            'Content-Type': 'text/plain',
          },
          body: JSON.stringify({ type: 'getRequestData', payload: undefined }),
        });

        if (!response.ok) {
          throw new Error('Không thể tải danh sách vật tư.');
        }

        const text = await response.text();
        const data = JSON.parse(text);
        const materialsFromApi = data.map((m: any) => ({
          ...m,
          price: 0,
          total: 0,
          note: m.Remark || '',
        }));

        const currentBidderName = form.getValues('bidderName');
        form.reset({ bidderName: currentBidderName, materials: materialsFromApi });
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

  const totalQuote = (watchedMaterials || []).reduce(
    (acc, current) => acc + (current.quantity || 0) * (current.price || 0),
    0
  );

  async function onSubmit(data: FormValues) {
    console.log('Gửi báo giá');
    setIsSubmitting(true);
    
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const timeStamp = `${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${now.getFullYear()}@${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;

    const submissionData = {
        type: 'appendBidResult',
        payload: {
            bidderName: data.bidderName,
            materials: data.materials.map(m => ({...m, total: m.quantity * m.price})),
            totalQuote,
            timeStamp,
        }
    };

    try {
      const apiUrl = process.env.NEXT_PUBLIC_APP_URL;
      if (!apiUrl) {
        throw new Error("Vui lòng định cấu hình NEXT_PUBLIC_APP_URL trong tệp .env.local của bạn.");
      }

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
        },
        body: JSON.stringify(submissionData),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Không thể đọc nội dung phản hồi lỗi.');
        throw new Error(`Yêu cầu gửi báo giá không thành công. Máy chủ trả về lỗi: ${errorText || response.statusText}`);
      }
      
      toast({
        title: 'Thành công!',
        description: 'Báo giá của bạn đã được gửi đi.',
      });
      
      const materials = form.getValues('materials').map(m => ({...m, price: 0}));
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

  const onInvalid = (errors: any) => {
    console.error('Lỗi xác thực biểu mẫu:', errors);
    toast({
        variant: 'destructive',
        title: 'Lỗi xác thực!',
        description: 'Vui lòng kiểm tra lại các trường đã nhập. Có vẻ như có một lỗi.',
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit, onInvalid)} className="space-y-8">
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
              Nhập đơn giá cho từng loại vật tư. Thành tiền và tổng cộng sẽ được tự động tính toán.
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
                      <TableHead className="hidden sm:table-cell">Đơn vị</TableHead>
                      <TableHead className="text-right">Số lượng</TableHead>
                      <TableHead className="w-[150px] text-right">Đơn giá (VNĐ)</TableHead>
                      <TableHead className="w-[150px] text-right">Thành tiền (VNĐ)</TableHead>
                      <TableHead className="w-[180px]">Ghi chú</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fields.map((field, index) => {
                      const material = watchedMaterials?.[index];
                      const itemTotal = (material?.price || 0) * (material?.quantity || 0);

                      return (
                        <TableRow key={field.id}>
                          <TableCell className="font-medium hidden sm:table-cell">{index + 1}</TableCell>
                          <TableCell className="font-medium">{field.name}</TableCell>
                          <TableCell className="hidden sm:table-cell">{field.unit}</TableCell>
                          <TableCell className="text-right">{field.quantity.toLocaleString('vi-VN')}</TableCell>
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
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {currencyFormatter.format(itemTotal)}
                          </TableCell>
                          <TableCell>{field.note ?? ''}</TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                  <TableFooter>
                    <TableRow>
                      <TableCell colSpan={5} className="hidden sm:table-cell" />
                      <TableCell colSpan={2} className="sm:hidden" />
                      <TableCell className="text-right font-bold text-lg">Tổng cộng</TableCell>
                      <TableCell className="text-right font-bold text-primary text-lg">
                        {currencyFormatter.format(totalQuote)}
                      </TableCell>
                      <TableCell/>
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
