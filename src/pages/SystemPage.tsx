import React, {useState} from "react";
import {Link} from "react-router-dom";
import {Download, Mail, Upload, Users} from "lucide-react";
import {PageContainer} from "../components";
import {Card, CardDescription, CardHeader, CardTitle} from "../components/ui/card";
import {exportEquipment, sendDashboardEmail} from "../api/client";

interface ActionCardProps {
    icon: React.ElementType;
    title: string;
    description: string;
    onClick?: () => void;
    to?: string;
    disabled?: boolean;
}

const ActionCard = ({icon: Icon, title, description, onClick, to, disabled}: ActionCardProps): React.JSX.Element => {
    const cardContent = (
        <Card
            className={[
                "h-full transition-colors",
                disabled
                    ? "opacity-50 cursor-not-allowed"
                    : "hover:bg-secondary cursor-pointer",
            ].join(" ")}
        >
            <CardHeader>
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-md bg-primary/10 text-primary">
                        <Icon className="w-5 h-5"/>
                    </div>
                    <CardTitle className="text-lg">{title}</CardTitle>
                </div>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
        </Card>
    );

    if (to) {
        return <Link to={to} className="block">{cardContent}</Link>;
    }
    return (
        <button type="button" onClick={onClick} disabled={disabled} className="text-left w-full">
            {cardContent}
        </button>
    );
};

const SystemPage = (): React.JSX.Element => {
    const [emailSending, setEmailSending] = useState(false);

    const handleExport = async (): Promise<void> => {
        await exportEquipment();
    };

    const handleEmailDashboard = async (): Promise<void> => {
        setEmailSending(true);
        const result = await sendDashboardEmail();
        setEmailSending(false);
        if (result.success) {
            alert("Dashboard email sent successfully!");
        } else {
            alert("Failed to send dashboard email: " + result.error);
        }
    };

    return (
        <PageContainer>
            <div className="flex flex-col gap-6 mb-8">
                <h1 data-testid="page-header" className="text-2xl font-bold text-foreground">System</h1>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <ActionCard
                        icon={Users}
                        title="Users"
                        description="Manage user accounts and roles."
                        to="/users"
                    />
                    <ActionCard
                        icon={Mail}
                        title={emailSending ? "Sending..." : "Email Dashboard"}
                        description="Send the current dashboard summary to your email."
                        onClick={handleEmailDashboard}
                        disabled={emailSending}
                    />
                    <ActionCard
                        icon={Download}
                        title="Export"
                        description="Download all equipment data as a JSON file."
                        onClick={handleExport}
                    />
                    <ActionCard
                        icon={Upload}
                        title="Import"
                        description="Upload equipment data from a JSON file."
                        to="/equipment/import"
                    />
                </div>
            </div>
        </PageContainer>
    );
};

export {SystemPage};
