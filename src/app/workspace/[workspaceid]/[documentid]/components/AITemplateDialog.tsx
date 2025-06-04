"use client";

import { type ReactNode, useState } from "react";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AlertCircle, Loader2 } from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { chatSession } from "@/lib/gemini-ai-model";
import { toast } from "react-hot-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface AITemplateDialogProps {
  children: ReactNode;
  onGenerateTemplate: (template: any) => void;
}

const formSchema = z.object({
  prompt: z
    .string()
    .min(1, "Please enter a prompt.")
    .max(100, "Prompt must be 100 characters or less"),
});

function AITemplateDialog({
  children,
  onGenerateTemplate,
}: AITemplateDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modelError, setModelError] = useState<string | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      prompt: "",
    },
  });

  const handleCancel = () => {
    setOpen(false);
    form.reset();
    setModelError(null);
  };

  const onModelReq = async (values: z.infer<typeof formSchema>) => {
    try {
      setIsSubmitting(true);
      setModelError(null);

      const prompt = `Generate template for editor.js in JSON for ${values.prompt}`;

      // Add timeout to prevent hanging requests
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Request timed out")), 30000);
      });

      // Race the model request against the timeout
      const result = (await Promise.race([
        chatSession.sendMessage(prompt),
        timeoutPromise,
      ])) as any;

      const responseText = await result.response.text();

      // Validate that the response is valid JSON
      let output;
      try {
        output = JSON.parse(responseText);

        // Validate the output has the expected structure
        if (!output.blocks || !Array.isArray(output.blocks)) {
          throw new Error("Invalid template structure");
        }

        onGenerateTemplate(output);
        setOpen(false);
        form.reset();
      } catch (jsonError) {
        console.error("JSON parsing error:", jsonError);
        setModelError(
          "The AI generated an invalid response. Please try a different prompt."
        );
        throw new Error("Invalid JSON response");
      }
    } catch (error: any) {
      console.error("AI template generation error:", error);

      // Handle specific error types
      if (error.message === "Request timed out") {
        setModelError("The request timed out. Please try again.");
      } else if (error?.response?.status === 400) {
        setModelError(
          "The AI model could not process your prompt. Please try a different prompt."
        );
        form.setError("prompt", {
          message: "Failed to generate a template.",
        });
      } else if (error?.response?.status === 429) {
        setModelError("Rate limit exceeded. Please try again later.");
      } else if (error?.name === "AbortError") {
        setModelError("The request was aborted. Please try again.");
      } else if (error?.message?.includes("safety")) {
        setModelError(
          "Your prompt was flagged by safety filters. Please try a different prompt."
        );
      } else {
        setModelError(
          "An error occurred while generating the template. Please try again."
        );
      }

      toast.error("Failed to generate template");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent
        onPointerDownOutside={(e) => e.preventDefault()}
        className="sm:max-w-[600px]"
      >
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Image
              src={"/images/gemini-icon.svg"}
              alt="Gemini"
              width={24}
              height={24}
            />
            <DialogTitle>AI Template Generate</DialogTitle>
          </div>
        </DialogHeader>
        <div>
          <DialogDescription className="pb-3">
            What do you want to write in this document?
          </DialogDescription>

          {modelError && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{modelError}</AlertDescription>
            </Alert>
          )}

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onModelReq)}
              className="space-y-4"
            >
              <FormField
                control={form.control}
                name="prompt"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        placeholder="Retail Stock Market Analysis"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <div className="flex w-full justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancel}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      "Generate"
                    )}
                  </Button>
                </div>
              </DialogFooter>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default AITemplateDialog;
