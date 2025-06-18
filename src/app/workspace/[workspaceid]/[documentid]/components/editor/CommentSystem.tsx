"use client";

import type { Editor } from "@tiptap/react";
import type { User } from "@prisma/client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageCircle, X } from "lucide-react";

interface CommentSystemProps {
  editor: Editor | null;
  currentUser: User;
}

interface Comment {
  id: string;
  content: string;
  author: {
    name: string;
    image?: string;
  };
  createdAt: Date;
  position: number;
}

export function CommentSystem({ editor, currentUser }: CommentSystemProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [showCommentForm, setShowCommentForm] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [selectedText, setSelectedText] = useState("");

  const handleAddComment = () => {
    if (!editor) return;

    const { from, to } = editor.state.selection;
    const text = editor.state.doc.textBetween(from, to);

    if (text.trim()) {
      setSelectedText(text);
      setShowCommentForm(true);
    }
  };

  const submitComment = () => {
    if (!newComment.trim()) return;

    const comment: Comment = {
      id: Date.now().toString(),
      content: newComment,
      author: {
        name: currentUser.name,
        image: currentUser.image || undefined,
      },
      createdAt: new Date(),
      position: editor?.state.selection.from || 0,
    };

    setComments([...comments, comment]);
    setNewComment("");
    setShowCommentForm(false);
    setSelectedText("");
  };

  const deleteComment = (commentId: string) => {
    setComments(comments.filter((c) => c.id !== commentId));
  };

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Comments</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={handleAddComment}
          disabled={!editor?.state.selection.empty === false}
        >
          <MessageCircle className="h-4 w-4 mr-2" />
          Add Comment
        </Button>
      </div>

      {/* Comment Form */}
      {showCommentForm && (
        <Card className="mb-4">
          <CardHeader className="pb-2">
            <div className="text-sm text-gray-600">
              Commenting on: "{selectedText}"
            </div>
          </CardHeader>
          <CardContent>
            <Textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add your comment..."
              className="mb-2"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={submitComment}>
                Comment
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setShowCommentForm(false);
                  setNewComment("");
                  setSelectedText("");
                }}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Comments List */}
      <div className="space-y-4">
        {comments.map((comment) => (
          <Card key={comment.id}>
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage
                    src={comment.author.image || "/placeholder.svg"}
                  />
                  <AvatarFallback>
                    {comment.author.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div className="font-medium text-sm">
                      {comment.author.name}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">
                        {comment.createdAt.toLocaleTimeString()}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteComment(comment.id)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm mt-1">{comment.content}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
