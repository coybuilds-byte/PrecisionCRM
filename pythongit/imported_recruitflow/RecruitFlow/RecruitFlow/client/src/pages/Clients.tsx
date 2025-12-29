import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Building2, Plus, Edit, Trash2, Globe, Mail, Phone, MapPin, FileText, ExternalLink, Briefcase, Upload, Download, CheckCircle2, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ObjectUploader } from "@/components/ObjectUploader";

import type { Client, InsertClient, Position } from "@shared/schema";

const clientSchema = z.object({
  companyName: z.string().min(1, "Company name is required"),
  contactName: z.string().min(1, "Contact name is required"),
  contactEmail: z.string().email("Valid email is required"),
  contactPhone: z.string().optional(),
  address: z.string().optional(),
  website: z.string().url("Must be a valid URL").or(z.literal("")).optional(),
  notes: z.string().optional(),
  recruiterId: z.string().default("c63b07a5-7323-4ae3-b3d5-e871d13526f0"),
});

const positionSchema = z.object({
  title: z.string().min(1, "Position title is required"),
  description: z.string().min(1, "Description is required"),
  requirements: z.string().optional(),
  salary: z.string().optional(),
  location: z.string().optional(),
  status: z.enum(["open", "on_hold", "filled", "cancelled"]).default("open"),
  clientId: z.string().min(1, "Client is required"),
  recruiterId: z.string().default("c63b07a5-7323-4ae3-b3d5-e871d13526f0"),
});

const employeeSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().optional(),
  title: z.string().optional(),
  isPrimary: z.boolean().default(false),
});

type ClientFormData = z.infer<typeof clientSchema>;
type PositionFormData = z.infer<typeof positionSchema>;
type EmployeeFormData = z.infer<typeof employeeSchema>;

interface ClientFormProps {
  client?: Client;
  onSuccess?: () => void;
}

function ClientForm({ client, onSuccess }: ClientFormProps) {
  const { toast } = useToast();
  
  const form = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      companyName: client?.companyName || "",
      contactName: client?.contactName || "",
      contactEmail: client?.contactEmail || "",
      contactPhone: client?.contactPhone || "",
      address: client?.address || "",
      website: client?.website || "",
      notes: client?.notes || "",
      recruiterId: client?.recruiterId || "c63b07a5-7323-4ae3-b3d5-e871d13526f0",
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: ClientFormData) => {
      const url = client ? `/api/clients/${client.id}` : '/api/clients';
      const method = client ? 'PUT' : 'POST';
      
      const response = await apiRequest(method, url, data);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || `Failed to ${client ? 'update' : 'create'} client`);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
      queryClient.invalidateQueries({ queryKey: ['/api/clients', 'c63b07a5-7323-4ae3-b3d5-e871d13526f0'] });
      toast({ 
        title: "Success", 
        description: `Client ${client ? 'updated' : 'created'} successfully!` 
      });
      form.reset();
      onSuccess?.();
    },
    onError: (error) => {
      toast({ 
        title: "Error", 
        description: error.message, 
        variant: "destructive" 
      });
    }
  });

  const onSubmit = (data: ClientFormData) => {
    mutation.mutate(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="companyName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Company Name</FormLabel>
                <FormControl>
                  <Input {...field} data-testid="input-company-name" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="contactName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Contact Name</FormLabel>
                <FormControl>
                  <Input {...field} data-testid="input-contact-name" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="contactEmail"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Contact Email</FormLabel>
                <FormControl>
                  <Input type="email" {...field} data-testid="input-contact-email" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="contactPhone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Contact Phone</FormLabel>
                <FormControl>
                  <Input {...field} data-testid="input-contact-phone" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="website"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Website</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="https://company.com" data-testid="input-website" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="address"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Address</FormLabel>
                <FormControl>
                  <Input {...field} data-testid="input-address" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea 
                  {...field} 
                  placeholder="Client notes, hiring preferences, past interactions..."
                  data-testid="input-notes"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-2">
          <Button 
            type="submit" 
            disabled={mutation.isPending}
            data-testid="button-submit-client"
          >
            {mutation.isPending ? "Saving..." : (client ? "Update Client" : "Create Client")}
          </Button>
        </div>
      </form>
    </Form>
  );
}

interface JobOrderFormProps {
  clientId: string;
  clientName: string;
  onSuccess?: () => void;
}

function JobOrderForm({ clientId, clientName, onSuccess }: JobOrderFormProps) {
  const { toast } = useToast();
  
  const form = useForm<PositionFormData>({
    resolver: zodResolver(positionSchema),
    defaultValues: {
      title: "",
      description: "",
      requirements: "",
      salary: "",
      location: "",
      status: "open",
      clientId: clientId,
      recruiterId: "c63b07a5-7323-4ae3-b3d5-e871d13526f0",
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: PositionFormData) => {
      const response = await apiRequest('POST', '/api/positions', data);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || 'Failed to create position');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/positions'] });
      toast({ 
        title: "Success", 
        description: "Job order created successfully!" 
      });
      form.reset();
      onSuccess?.();
    },
    onError: (error) => {
      toast({ 
        title: "Error", 
        description: error.message, 
        variant: "destructive" 
      });
    }
  });

  const onSubmit = (data: PositionFormData) => {
    mutation.mutate(data);
  };

  const statusOptions = [
    { value: "open", label: "Open" },
    { value: "on_hold", label: "On Hold" },
    { value: "filled", label: "Filled" },
    { value: "cancelled", label: "Cancelled" },
  ];

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="bg-muted p-3 rounded-md">
          <p className="text-sm">
            <span className="font-medium">Client:</span> {clientName}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Position Title</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="e.g., Senior Software Engineer" data-testid="input-position-title" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-status">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {statusOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="location"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Location</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="e.g., San Francisco, CA" data-testid="input-location" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="salary"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Salary Range</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="e.g., $120,000 - $150,000" data-testid="input-salary" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Job Description</FormLabel>
              <FormControl>
                <Textarea 
                  {...field} 
                  placeholder="Describe the role, responsibilities, and team..."
                  rows={4}
                  data-testid="input-description"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="requirements"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Requirements</FormLabel>
              <FormControl>
                <Textarea 
                  {...field} 
                  placeholder="List required skills, experience, education..."
                  rows={3}
                  data-testid="input-requirements"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-2">
          <Button 
            type="submit" 
            disabled={mutation.isPending}
            data-testid="button-submit-position"
          >
            {mutation.isPending ? "Creating..." : "Create Job Order"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

interface EmployeeFormProps {
  clientId: string;
  employee?: any;
  onSuccess?: () => void;
}

function EmployeeForm({ clientId, employee, onSuccess }: EmployeeFormProps) {
  const { toast } = useToast();
  
  const form = useForm<EmployeeFormData>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      firstName: employee?.firstName || employee?.first_name || "",
      lastName: employee?.lastName || employee?.last_name || "",
      email: employee?.email || employee?.contact_email || "",
      phone: employee?.phone || employee?.contact_phone || "",
      title: employee?.title || "",
      isPrimary: employee?.isPrimary || employee?.is_primary || false,
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: EmployeeFormData) => {
      const url = employee ? `/api/clients/${clientId}/employees/${employee.id}` : `/api/clients/${clientId}/employees`;
      const method = employee ? 'PUT' : 'POST';
      
      const response = await apiRequest(method, url, data);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || `Failed to ${employee ? 'update' : 'add'} employee`);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients', clientId, 'employees'] });
      toast({ 
        title: "Success", 
        description: `Employee ${employee ? 'updated' : 'added'} successfully!` 
      });
      form.reset();
      onSuccess?.();
    },
    onError: (error) => {
      toast({ 
        title: "Error", 
        description: error.message, 
        variant: "destructive" 
      });
    }
  });

  const onSubmit = (data: EmployeeFormData) => {
    mutation.mutate(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>First Name</FormLabel>
                <FormControl>
                  <Input {...field} data-testid="input-employee-first-name" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="lastName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Last Name</FormLabel>
                <FormControl>
                  <Input {...field} data-testid="input-employee-last-name" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input type="email" {...field} data-testid="input-employee-email" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone</FormLabel>
                <FormControl>
                  <Input {...field} data-testid="input-employee-phone" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem className="col-span-2">
                <FormLabel>Job Title</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="e.g., Hiring Manager, HR Director" data-testid="input-employee-title" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end">
          <Button 
            type="submit" 
            disabled={mutation.isPending}
            data-testid="button-submit-employee"
          >
            {mutation.isPending ? "Saving..." : (employee ? "Update Employee" : "Add Employee")}
          </Button>
        </div>
      </form>
    </Form>
  );
}

interface ClientDetailsDialogProps {
  client: Client;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
  onGenerateAgreement: (clientId: string) => void;
  isGeneratingAgreement: boolean;
}

function ClientDetailsDialog({ client, open, onOpenChange, onUpdate, onGenerateAgreement, isGeneratingAgreement }: ClientDetailsDialogProps) {
  const { toast } = useToast();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isJobOrderDialogOpen, setIsJobOrderDialogOpen] = useState(false);
  const [isAddEmployeeDialogOpen, setIsAddEmployeeDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<any>(null);

  // Fetch employees for this client
  const { data: employees = [] } = useQuery<any[]>({
    queryKey: ['/api/clients', client.id, 'employees'],
    enabled: open,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest('DELETE', `/api/clients/${id}`);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete client');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
      toast({ title: "Success", description: "Client deleted successfully!" });
      onOpenChange(false);
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const deleteEmployeeMutation = useMutation({
    mutationFn: async (employeeId: string) => {
      const response = await apiRequest('DELETE', `/api/clients/${client.id}/employees/${employeeId}`);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete employee');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients', client.id, 'employees'] });
      toast({ title: "Success", description: "Employee deleted successfully!" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const uploadAgreementMutation = useMutation({
    mutationFn: async (agreementUrl: string) => {
      const response = await apiRequest('PUT', `/api/clients/${client.id}`, {
        signedAgreementUrl: agreementUrl,
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update client with signed agreement');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
      toast({ title: "Success", description: "Signed agreement uploaded successfully!" });
      onUpdate();
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const handleEdit = () => {
    setIsEditDialogOpen(false);
    onUpdate();
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Building2 className="h-6 w-6 text-primary" />
              <div>
                <DialogTitle className="text-xl" data-testid={`text-company-name-${client.id}`}>
                  {client.companyName}
                </DialogTitle>
                <DialogDescription data-testid={`text-contact-name-${client.id}`}>
                  Contact: {client.contactName}
                </DialogDescription>
              </div>
            </div>
            {client.agreementSigned && (
              <Badge variant="secondary" data-testid={`badge-agreement-${client.id}`}>
                Agreement Signed
              </Badge>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Contact Information */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground">Contact Information</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <a href={`mailto:${client.contactEmail}`} className="text-sm hover:underline" data-testid={`text-email-${client.id}`}>
                  {client.contactEmail}
                </a>
              </div>
              
              {client.contactPhone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <a href={`tel:${client.contactPhone}`} className="text-sm hover:underline" data-testid={`text-phone-${client.id}`}>
                    {client.contactPhone}
                  </a>
                </div>
              )}
              
              {client.website && (
                <div className="flex items-center gap-3">
                  <Globe className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <a 
                    href={client.website} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline"
                    data-testid={`link-website-${client.id}`}
                  >
                    {client.website}
                  </a>
                </div>
              )}
              
              {client.address && (
                <div className="flex items-center gap-3">
                  <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-sm" data-testid={`text-address-${client.id}`}>
                    {client.address}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          {client.notes && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground">Notes</h3>
              <div className="flex items-start gap-3">
                <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                <p className="text-sm" data-testid={`text-notes-${client.id}`}>
                  {client.notes}
                </p>
              </div>
            </div>
          )}

          {/* Client Employees */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-muted-foreground">Client Employees</h3>
              <Dialog open={isAddEmployeeDialogOpen} onOpenChange={setIsAddEmployeeDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" data-testid={`button-add-employee-${client.id}`}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Employee
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Employee</DialogTitle>
                    <DialogDescription>
                      Add a new employee contact for {client.companyName}
                    </DialogDescription>
                  </DialogHeader>
                  <EmployeeForm 
                    clientId={client.id} 
                    onSuccess={() => setIsAddEmployeeDialogOpen(false)} 
                  />
                </DialogContent>
              </Dialog>
            </div>
            
            {employees.length > 0 ? (
              <div className="space-y-2">
                {employees.map((employee: any) => (
                  <div 
                    key={employee.id} 
                    className="flex items-center justify-between p-3 bg-muted rounded-md"
                    data-testid={`employee-${employee.id}`}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Users className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate" data-testid={`text-employee-name-${employee.id}`}>
                          {employee.firstName || employee.first_name} {employee.lastName || employee.last_name}
                          {employee.title && <span className="text-muted-foreground"> - {employee.title}</span>}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="truncate" data-testid={`text-employee-email-${employee.id}`}>
                            {employee.email || employee.contact_email}
                          </span>
                          {(employee.phone || employee.contact_phone) && (
                            <>
                              <span>•</span>
                              <span data-testid={`text-employee-phone-${employee.id}`}>
                                {employee.phone || employee.contact_phone}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Dialog open={editingEmployee?.id === employee.id} onOpenChange={(open) => {
                        if (!open) setEditingEmployee(null);
                      }}>
                        <DialogTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => setEditingEmployee(employee)}
                            data-testid={`button-edit-employee-${employee.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Edit Employee</DialogTitle>
                            <DialogDescription>
                              Update employee information
                            </DialogDescription>
                          </DialogHeader>
                          <EmployeeForm 
                            clientId={client.id} 
                            employee={employee}
                            onSuccess={() => setEditingEmployee(null)} 
                          />
                        </DialogContent>
                      </Dialog>
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            data-testid={`button-delete-employee-${employee.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Employee</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to remove {employee.firstName || employee.first_name} {employee.lastName || employee.last_name} from {client.companyName}?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteEmployeeMutation.mutate(employee.id)}
                              disabled={deleteEmployeeMutation.isPending}
                            >
                              {deleteEmployeeMutation.isPending ? "Deleting..." : "Delete"}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No employees added yet. Add employees to use them as interviewers.
              </p>
            )}
          </div>

          {/* Signed Agreement */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground">Signed Agreement</h3>
            {client.signedAgreementUrl ? (
              <div className="flex items-center justify-between p-3 bg-muted rounded-md">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="text-sm font-medium">Agreement Uploaded</p>
                    <p className="text-xs text-muted-foreground">
                      Signed on {formatDate(client.agreementSigned?.toString() || null)}
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => client.signedAgreementUrl && window.open(client.signedAgreementUrl, '_blank')}
                  data-testid={`button-view-agreement-${client.id}`}
                >
                  <Download className="h-4 w-4 mr-2" />
                  View
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <ObjectUploader
                  maxNumberOfFiles={1}
                  maxFileSize={10485760}
                  onGetUploadParameters={async (file) => {
                    const response = await fetch('/api/upload/presigned-url', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        fileName: `agreements/signed_${client.companyName.replace(/\s+/g, '_')}_${Date.now()}_${file.name}`,
                        contentType: file.type,
                      }),
                      credentials: 'include',
                    });
                    const data = await response.json();
                    return { method: 'PUT', url: data.url };
                  }}
                  onComplete={(result) => {
                    if (result.successful && result.successful.length > 0) {
                      const uploadedFile = result.successful[0];
                      const fileUrl = uploadedFile.uploadURL?.split('?')[0];
                      if (fileUrl) {
                        uploadAgreementMutation.mutate(fileUrl);
                      }
                    }
                  }}
                  buttonClassName="w-full"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Signed Agreement
                </ObjectUploader>
              </div>
            )}
          </div>

          {/* Metadata */}
          <div className="pt-4 border-t">
            <span className="text-xs text-muted-foreground" data-testid={`text-created-${client.id}`}>
              Added on {formatDate(client.createdAt?.toString() || null)}
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <Dialog open={isJobOrderDialogOpen} onOpenChange={setIsJobOrderDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  variant="default"
                  data-testid={`button-add-job-order-${client.id}`}
                >
                  <Briefcase className="h-4 w-4 mr-2" />
                  Add Job Order
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create Job Order</DialogTitle>
                  <DialogDescription>
                    Add a new position for {client.companyName}
                  </DialogDescription>
                </DialogHeader>
                <JobOrderForm 
                  clientId={client.id} 
                  clientName={client.companyName}
                  onSuccess={() => setIsJobOrderDialogOpen(false)} 
                />
              </DialogContent>
            </Dialog>

            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  variant="outline"
                  data-testid={`button-edit-client-${client.id}`}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Edit Client</DialogTitle>
                  <DialogDescription>
                    Update client information and contact details.
                  </DialogDescription>
                </DialogHeader>
                <ClientForm client={client} onSuccess={handleEdit} />
              </DialogContent>
            </Dialog>
            
            <Button 
              variant="outline"
              onClick={() => onGenerateAgreement(client.id)}
              disabled={isGeneratingAgreement}
              data-testid={`button-agreement-${client.id}`}
              title="Generate Agreement for Client Signing"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Generate Agreement
            </Button>
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="outline"
                  data-testid={`button-delete-client-${client.id}`}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Client</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete {client.companyName}? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => deleteMutation.mutate(client.id)}
                    disabled={deleteMutation.isPending}
                    data-testid="button-confirm-delete"
                  >
                    {deleteMutation.isPending ? "Deleting..." : "Delete"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface ClientCardProps {
  client: Client;
  onUpdate: () => void;
  onGenerateAgreement: (clientId: string) => void;
  isGeneratingAgreement: boolean;
}

function ClientCard({ client, onUpdate, onGenerateAgreement, isGeneratingAgreement }: ClientCardProps) {
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  return (
    <>
      <Card 
        className="hover-elevate active-elevate-2 cursor-pointer" 
        onClick={() => setIsDetailsOpen(true)}
        data-testid={`card-client-${client.id}`}
      >
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <Building2 className="h-5 w-5 text-primary flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <CardTitle className="text-base truncate" data-testid={`text-company-name-${client.id}`}>
                  {client.companyName}
                </CardTitle>
                <CardDescription className="truncate" data-testid={`text-contact-name-${client.id}`}>
                  {client.contactName}
                </CardDescription>
              </div>
            </div>
            {client.agreementSigned && (
              <Badge variant="secondary" className="flex-shrink-0">
                Signed
              </Badge>
            )}
          </div>
        </CardHeader>
        
        <CardContent className="pt-0">
          {client.contactPhone && (
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="text-sm truncate" data-testid={`text-phone-${client.id}`}>
                {client.contactPhone}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      <ClientDetailsDialog
        client={client}
        open={isDetailsOpen}
        onOpenChange={setIsDetailsOpen}
        onUpdate={onUpdate}
        onGenerateAgreement={onGenerateAgreement}
        isGeneratingAgreement={isGeneratingAgreement}
      />
    </>
  );
}

export default function Clients() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [agreementDialogOpen, setAgreementDialogOpen] = useState(false);
  const [currentAgreement, setCurrentAgreement] = useState<{ text: string; clientName: string } | null>(null);
  const recruiterId = "c63b07a5-7323-4ae3-b3d5-e871d13526f0";
  const { toast } = useToast();

  const { data: clients = [], isLoading } = useQuery<Client[]>({
    queryKey: ['/api/clients', recruiterId],
    queryFn: async () => {
      const response = await fetch(`/api/clients?recruiterId=${recruiterId}`, {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch clients');
      }
      return response.json();
    },
    staleTime: 30000,
  });

  const generateAgreementMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest('POST', `/api/integration/psm/generate-agreement/${id}`);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate agreement');
      }
      return response.json();
    },
    onSuccess: (data, clientId) => {
      const client = clients.find(c => c.id === clientId);
      setCurrentAgreement({ 
        text: data.agreementText, 
        clientName: client?.companyName || 'Client' 
      });
      setAgreementDialogOpen(true);
      toast({ 
        title: "Success", 
        description: "Agreement generated successfully!" 
      });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const downloadAgreement = () => {
    if (!currentAgreement) return;
    
    const blob = new Blob([currentAgreement.text], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `PSM_Agreement_${currentAgreement.clientName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    toast({
      title: "Downloaded",
      description: "Agreement downloaded successfully!"
    });
  };

  const handleCreate = () => {
    setIsCreateDialogOpen(false);
  };

  const handleUpdate = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
    queryClient.invalidateQueries({ queryKey: ['/api/clients', recruiterId] });
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold">Clients</h1>
            <p className="text-muted-foreground">Manage your client companies and contacts</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6" data-testid="page-clients">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold" data-testid="text-page-title">Clients</h1>
          <p className="text-muted-foreground" data-testid="text-page-description">
            Manage your client companies and contacts
          </p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-client">
              <Plus className="h-4 w-4 mr-2" />
              Add Client
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Client</DialogTitle>
              <DialogDescription>
                Add a new client company with contact information.
              </DialogDescription>
            </DialogHeader>
            <ClientForm onSuccess={handleCreate} />
          </DialogContent>
        </Dialog>
      </div>

      {clients.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2" data-testid="text-no-clients">
              No clients yet
            </h3>
            <p className="text-muted-foreground text-center mb-4">
              Start building your client portfolio by adding your first client company.
            </p>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-first-client">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Client
                </Button>
              </DialogTrigger>
            </Dialog>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {clients.map((client) => (
            <ClientCard 
              key={client.id} 
              client={client} 
              onUpdate={handleUpdate}
              onGenerateAgreement={(clientId) => generateAgreementMutation.mutate(clientId)}
              isGeneratingAgreement={generateAgreementMutation.isPending}
            />
          ))}
        </div>
      )}

      {/* Agreement Display Dialog */}
      <Dialog open={agreementDialogOpen} onOpenChange={setAgreementDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle>Recruitment Agreement - {currentAgreement?.clientName}</DialogTitle>
            <DialogDescription>
              Review the generated agreement and download it for client signature.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-muted p-6 rounded-lg max-h-[50vh] overflow-y-auto">
              <pre className="whitespace-pre-wrap text-sm font-mono">
                {currentAgreement?.text}
              </pre>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setAgreementDialogOpen(false)}
                data-testid="button-close-agreement"
              >
                Close
              </Button>
              <Button
                onClick={downloadAgreement}
                data-testid="button-download-agreement"
              >
                <FileText className="h-4 w-4 mr-2" />
                Download Agreement
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
